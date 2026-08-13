import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';
import crypto from 'crypto';

interface UserPayload {
  id: string;
  email: string;
  role: string;
}

class TokenGenerator {
  generateTokens(user: UserPayload) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      environment.JWT_SECRET,
      { expiresIn: environment.JWT_EXPIRES_IN }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string) {
    return jwt.verify(token, environment.JWT_SECRET);
  }

  generateDeviceToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

export const tokenGenerator = new TokenGenerator();