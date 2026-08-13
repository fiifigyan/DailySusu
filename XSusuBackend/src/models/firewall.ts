import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { hackersDetector } from '../utils/hackersDetector';

interface SuspiciousActivity {
  ip: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
  reasons: string[];
}

const SUSPICIOUS_PATTERNS = [
  // SQL Injection patterns
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  
  // XSS patterns
  /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
  /<script|<\/script|javascript:|onerror=|onload=/i,
  
  // Path traversal
  /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e\\/i,
  
  // Command injection
  /[;&|`$()]|\b(cat|ls|pwd|whoami|wget|curl)\b/i,
];

export async function firewallMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const deviceId = req.headers['x-device-id'] as string;
  
  // Check if IP is already blocked
  const isBlocked = await redisClient.get(`blocked:${clientIp}`);
  if (isBlocked) {
    logger.warn(`Blocked request from banned IP: ${clientIp}`);
    res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'IP_BLOCKED',
    });
    return;
  }

  // Track request for rate analysis
  await trackRequest(clientIp, req.path);

  // Check for suspicious patterns in request
  const suspiciousFindings = checkForSuspiciousPatterns(req);
  
  if (suspiciousFindings.length > 0) {
    await handleSuspiciousActivity(clientIp, deviceId, suspiciousFindings);
    
    res.status(403).json({
      success: false,
      message: 'Request blocked for security reasons',
      code: 'SUSPICIOUS_ACTIVITY',
    });
    return;
  }

  // Check for rapid-fire requests (DDoS pattern)
  const isRapidFire = await checkRapidFire(clientIp);
  if (isRapidFire) {
    await blockIP(clientIp, 'Rapid fire requests detected');
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  // Check for known malicious user agents
  if (isMaliciousUserAgent(userAgent)) {
    await blockIP(clientIp, 'Malicious user agent detected');
    res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'MALICIOUS_UA',
    });
    return;
  }

  // Add security headers to response
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Add request ID for tracking
  const requestId = generateRequestId();
  res.setHeader('X-Request-ID', requestId);

  next();
}

async function trackRequest(ip: string, path: string): Promise<void> {
  const key = `requests:${ip}`;
  const now = Date.now();
  
  await redisClient.zAdd(key, { score: now, value: `${path}:${now}` });
  await redisClient.expire(key, 300); // 5 minutes window
}

async function checkRapidFire(ip: string): Promise<boolean> {
  const key = `requests:${ip}`;
  const fiveSecondsAgo = Date.now() - 5000;
  
  const recentRequests = await redisClient.zCount(key, fiveSecondsAgo, Date.now());
  return recentRequests > 50; // More than 50 requests in 5 seconds
}

function checkForSuspiciousPatterns(req: Request): string[] {
  const findings: string[] = [];
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    url: req.url,
  });

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(requestData)) {
      findings.push(`Pattern matched: ${pattern.source}`);
    }
  }

  // Check for unusual headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-requested-with',
  ];

  for (const header of suspiciousHeaders) {
    const value = req.headers[header];
    if (value && typeof value === 'string' && value.length > 100) {
      findings.push(`Suspicious header: ${header}`);
    }
  }

  return findings;
}

function isMaliciousUserAgent(userAgent: string): boolean {
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /gobuster/i,
    /dirbuster/i,
    /hydra/i,
    /metasploit/i,
    /burpsuite/i,
    /acunetix/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(userAgent));
}

async function handleSuspiciousActivity(
  ip: string,
  deviceId: string,
  findings: string[]
): Promise<void> {
  const key = `suspicious:${ip}`;
  const activity: SuspiciousActivity = {
    ip,
    count: await redisClient.incr(`${key}:count`),
    firstSeen: parseInt(await redisClient.get(`${key}:firstSeen`) || String(Date.now())),
    lastSeen: Date.now(),
    blocked: false,
    reasons: findings,
  };

  await redisClient.set(`${key}:firstSeen`, String(activity.firstSeen));
  await redisClient.set(`${key}:data`, JSON.stringify(activity));
  await redisClient.expire(key, 3600); // 1 hour

  // Auto-block after 3 suspicious activities
  if (activity.count >= 3) {
    await blockIP(ip, 'Multiple suspicious activities detected');
  }

  logger.warn(`Suspicious activity from ${ip}:`, findings);
  hackersDetector.reportActivity(activity);
}

async function blockIP(ip: string, reason: string): Promise<void> {
  await redisClient.set(`blocked:${ip}`, reason);
  await redisClient.expire(`blocked:${ip}`, 86400); // 24 hour ban
  
  logger.warn(`🚫 IP Blocked: ${ip} - Reason: ${reason}`);
  hackersDetector.reportBlock(ip, reason);
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}