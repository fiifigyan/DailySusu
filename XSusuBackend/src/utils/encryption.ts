import crypto from 'crypto';
import { environment } from '../config/environment';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(environment.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(encryptedData: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function hashPhone(phone: string): string {
  return crypto
    .createHmac('sha256', environment.ENCRYPTION_KEY)
    .update(phone)
    .digest('hex');
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function generateTransactionRef(): string {
  return `XSUSU-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}