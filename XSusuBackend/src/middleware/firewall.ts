import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { hackersDetector } from '../utils/hackersDetector';

/**
 * FIREWALL MIDDLEWARE
 * 
 * Enterprise-grade protection against:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Path Traversal
 * - Command Injection
 * - DDoS (Distributed Denial of Service)
 * - Brute Force Attacks
 * - Malicious User Agents
 * - Rapid-Fire Requests
 */

interface SuspiciousActivity {
  ip: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  reasons: string[];
}

// Suspicious pattern definitions
const SUSPICIOUS_PATTERNS = [
  // SQL Injection patterns
  { name: 'SQL_INJECTION', regex: /(\%27)|(\')|(\-\-)|(\%23)|(#)/i },
  { name: 'SQL_UNION', regex: /union\s+select|select\s+.*\s+from|drop\s+table|delete\s+from/i },
  { name: 'SQL_COMMENT', regex: /(\%3D)|(=)[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i },
  
  // XSS patterns
  { name: 'XSS_SCRIPT', regex: /<script|<\/script|javascript:|onerror=|onload=|alert\(/i },
  { name: 'XSS_EVENT', regex: /onclick=|onmouseover=|onfocus=|onblur=/i },
  
  // Path traversal
  { name: 'PATH_TRAVERSAL', regex: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e\\/i },
  
  // Command injection
  { name: 'COMMAND_INJECTION', regex: /[;&|`$()]|\b(cat|ls|pwd|whoami|wget|curl|rm\s+-rf)\b/i },
  
  // NoSQL injection
  { name: 'NOSQL_INJECTION', regex: /\$where|\$gt|\$lt|\$ne|\$exists|\$regex/i },
  
  // Server-side template injection
  { name: 'SSTI', regex: /\{\{.*\}\}|\${.*}|<%.*%>/i },
  
  // File inclusion
  { name: 'FILE_INCLUSION', regex: /include\s*\(|require\s*\(|include_once|require_once/i },
];

// Malicious user agents
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /dirb/i,
  /hydra/i,
  /metasploit/i,
  /burpsuite/i,
  /acunetix/i,
  /netsparker/i,
  /vega/i,
  /w3af/i,
  /openvas/i,
  /whatweb/i,
  /nessus/i,
  /skipfish/i,
  /havij/i,
];

export async function firewallMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const deviceId = (req.headers['x-device-id'] as string) || '';

  // ============================================
  // 1. Check if IP is BLOCKED
  // ============================================
  try {
    const blockReason = await redisClient.get(`blocked:${clientIp}`);
    if (blockReason) {
      logger.warn(`🚫 Blocked request from ${clientIp} - Reason: ${blockReason}`);
      res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'IP_BLOCKED',
        blockedAt: new Date().toISOString(),
      });
      return;
    }
  } catch (redisError) {
    // Redis unavailable - continue without blocking check
    logger.error('Redis error in firewall (blocked check):', redisError);
  }

  // ============================================
  // 2. Check for MALICIOUS USER AGENT
  // ============================================
  if (isMaliciousUserAgent(userAgent)) {
    await blockIP(clientIp, 'Malicious user agent detected');
    logger.error(`🚨 Malicious user agent blocked: ${clientIp} - UA: ${userAgent.substring(0, 100)}`);
    res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'MALICIOUS_UA',
    });
    return;
  }

  // ============================================
  // 3. Check for SUSPICIOUS PATTERNS
  // ============================================
  const suspiciousFindings = checkForSuspiciousPatterns(req);

  if (suspiciousFindings.length > 0) {
    await handleSuspiciousActivity(clientIp, deviceId, suspiciousFindings);
    logger.error(`🚨 Suspicious activity from ${clientIp}: ${suspiciousFindings.join(', ')}`);
    
    res.status(403).json({
      success: false,
      message: 'Request blocked for security reasons',
      code: 'SUSPICIOUS_ACTIVITY',
    });
    return;
  }

  // ============================================
  // 4. Check for RAPID-FIRE REQUESTS (DDoS)
  // ============================================
  try {
    const isRapidFire = await checkRapidFire(clientIp);
    if (isRapidFire) {
      await blockIP(clientIp, 'Rapid fire requests detected (possible DDoS)');
      logger.error(`🚨 DDoS pattern detected from ${clientIp} - IP blocked for 24 hours`);
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }
  } catch (redisError) {
    logger.error('Redis error in firewall (rapid fire):', redisError);
  }

  // ============================================
  // 5. Track request for pattern analysis
  // ============================================
  try {
    await trackRequest(clientIp, req.path, req.method);
  } catch (redisError) {
    // Non-critical - continue
  }

  // ============================================
  // 6. Set security headers
  // ============================================
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * Track request for rate analysis
 */
async function trackRequest(ip: string, path: string, method: string): Promise<void> {
  const key = `requests:${ip}`;
  const now = Date.now();

  await redisClient.zAdd(key, { score: now, value: `${method}:${path}:${now}` });
  await redisClient.expire(key, 300); // Keep 5 minutes of history
}

/**
 * Check for rapid-fire requests (>50 in 5 seconds)
 */
async function checkRapidFire(ip: string): Promise<boolean> {
  const key = `requests:${ip}`;
  const fiveSecondsAgo = Date.now() - 5000;

  const recentCount = await redisClient.zCount(key, fiveSecondsAgo, Date.now());
  return recentCount > 50;
}

/**
 * Check request for suspicious patterns
 */
function checkForSuspiciousPatterns(req: Request): string[] {
  const findings: string[] = [];

  // Combine request data for scanning
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    url: req.url,
  });

  // Scan for each pattern
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.regex.test(requestData)) {
      findings.push(pattern.name);
    }
  }

  // Check headers for suspicious values
  const suspiciousHeaderValues = [
    req.headers['x-forwarded-for'],
    req.headers['x-real-ip'],
  ];

  for (const headerValue of suspiciousHeaderValues) {
    if (headerValue && typeof headerValue === 'string' && headerValue.length > 200) {
      findings.push('SUSPICIOUS_HEADER');
    }
  }

  return findings;
}

/**
 * Check if user agent is malicious
 */
function isMaliciousUserAgent(userAgent: string): boolean {
  return MALICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent));
}

/**
 * Handle suspicious activity - track and auto-block
 */
async function handleSuspiciousActivity(
  ip: string,
  deviceId: string,
  findings: string[]
): Promise<void> {
  const key = `suspicious:${ip}`;

  try {
    const count = await redisClient.incr(`${key}:count`);
    
    if (count === 1) {
      await redisClient.set(`${key}:firstSeen`, String(Date.now()));
      await redisClient.expire(`${key}:count`, 3600); // Reset after 1 hour
    }

    const activity: SuspiciousActivity = {
      ip,
      count,
      firstSeen: parseInt(await redisClient.get(`${key}:firstSeen`) || String(Date.now())),
      lastSeen: Date.now(),
      reasons: findings,
    };

    // Store activity details
    await redisClient.set(`${key}:data`, JSON.stringify(activity));
    await redisClient.expire(`${key}:data`, 3600);

    // Auto-block after 3 suspicious activities
    if (count >= 3) {
      await blockIP(ip, 'Multiple suspicious activities detected');
      logger.error(`🚨 IP ${ip} auto-blocked after ${count} suspicious activities`);
    }

    // Report to hackers detector
    hackersDetector.reportActivity(activity);
  } catch (error) {
    logger.error('Error handling suspicious activity:', error);
  }
}

/**
 * Block an IP address
 */
async function blockIP(ip: string, reason: string): Promise<void> {
  try {
    await redisClient.set(`blocked:${ip}`, reason);
    await redisClient.expire(`blocked:${ip}`, 86400); // 24 hour ban

    // For repeat offenders, ban longer
    const repeatCount = await redisClient.incr(`blocked:count:${ip}`);
    await redisClient.expire(`blocked:count:${ip}`, 86400 * 7);

    if (repeatCount > 3) {
      // 7-day ban for repeat offenders
      await redisClient.expire(`blocked:${ip}`, 86400 * 7);
      logger.error(`🚨 Repeat offender ${ip} banned for 7 days`);
    }

    hackersDetector.reportBlock(ip, reason);
  } catch (error) {
    logger.error('Error blocking IP:', error);
  }
}