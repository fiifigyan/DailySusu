import { redisClient } from '../config/redis';
import { logger } from './logger';

interface AttackPattern {
  type: string;
  ip: string;
  timestamp: number;
  details: any;
}

class HackersDetector {
  private attackPatterns: AttackPattern[] = [];
  private blockedIPs: Set<string> = new Set();

  async reportActivity(activity: any): Promise<void> {
    const pattern: AttackPattern = {
      type: 'SUSPICIOUS_ACTIVITY',
      ip: activity.ip,
      timestamp: Date.now(),
      details: activity,
    };

    this.attackPatterns.push(pattern);
    
    // Store in Redis for persistence
    await redisClient.lPush(
      'security:attacks',
      JSON.stringify(pattern)
    );
    
    // Keep only last 1000 attacks
    await redisClient.lTrim('security:attacks', 0, 999);

    // Check if this is part of a larger attack
    await this.analyzeAttackPattern(activity.ip);
  }

  async reportBlock(ip: string, reason: string): Promise<void> {
    this.blockedIPs.add(ip);
    
    const pattern: AttackPattern = {
      type: 'IP_BLOCKED',
      ip,
      timestamp: Date.now(),
      details: { reason },
    };

    await redisClient.lPush('security:blocks', JSON.stringify(pattern));
    await redisClient.lTrim('security:blocks', 0, 999);
  }

  private async analyzeAttackPattern(ip: string): Promise<void> {
    const recentAttacks = this.attackPatterns.filter(
      a => a.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    const attacksFromIP = recentAttacks.filter(a => a.ip === ip);

    // Check for distributed attack (multiple IPs with same pattern)
    const similarPatterns = recentAttacks.filter(a => 
      a.type === attacksFromIP[0]?.type && a.ip !== ip
    );

    if (similarPatterns.length > 5) {
      logger.error('🚨 Potential distributed attack detected!');
      logger.error(`Multiple IPs showing same pattern: ${attacksFromIP[0]?.type}`);
      
      // Block all suspicious IPs
      for (const attack of similarPatterns) {
        await redisClient.set(`blocked:${attack.ip}`, 'Distributed attack detected');
        await redisClient.expire(`blocked:${attack.ip}`, 86400);
      }
    }

    // Check for brute force pattern
    const bruteForceAttempts = attacksFromIP.filter(
      a => a.type === 'SUSPICIOUS_ACTIVITY'
    );

    if (bruteForceAttempts.length > 10) {
      logger.error(`🚨 Brute force attack detected from ${ip}`);
      await redisClient.set(`blocked:${ip}`, 'Brute force attack');
      await redisClient.expire(`blocked:${ip}`, 86400 * 7); // 7 day ban
    }
  }

  getStats() {
    return {
      totalAttacks: this.attackPatterns.length,
      blockedIPs: this.blockedIPs.size,
      recentAttacks: this.attackPatterns.slice(-10),
    };
  }
}

export const hackersDetector = new HackersDetector();