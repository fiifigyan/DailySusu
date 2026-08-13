import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { environment } from '../config/environment';
import { generateOTP, hashPhone } from '../utils/encryption';
import { tokenGenerator } from '../utils/tokenGenerator';
import { logger } from '../utils/logger';

export class AuthService {
  async register(data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phoneHash: hashPhone(data.phone) },
        ],
      },
    });

    if (existingUser) {
      throw Object.assign(new Error('User already exists'), { statusCode: 409 });
    }

    const hashedPassword = await bcrypt.hash(data.password, environment.BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        phoneHash: hashPhone(data.phone),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    // Generate and send OTP
    const otp = generateOTP();
    await prisma.oTP.create({
      data: {
        code: otp,
        userId: user.id,
        purpose: 'VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // TODO: Send OTP via email/SMS
    logger.info(`OTP for ${data.email}: ${otp}`);

    return { userId: user.id };
  }

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw Object.assign(
        new Error('Account temporarily locked. Try again later.'),
        { statusCode: 423 }
      );
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updates: any = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await prisma.user.update({ where: { id: user.id }, data: updates });

      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    // Reset failed attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = tokenGenerator.generateTokens(user);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { password, phoneHash, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      ...tokens,
    };
  }

  async verifyOTP(data: { email: string; otp: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        code: data.otp,
        purpose: 'VERIFICATION',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });
    }

    await prisma.$transaction([
      prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    const tokens = tokenGenerator.generateTokens(user);

    return { ...tokens, isVerified: true };
  }

  async resendOTP(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const otp = generateOTP();
    await prisma.oTP.create({
      data: {
        code: otp,
        userId: user.id,
        purpose: 'VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    logger.info(`New OTP for ${email}: ${otp}`);
  }

  async refreshAccessToken(refreshToken: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: storedToken.userId } });
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = tokenGenerator.generateTokens(user);

    // Create new refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return user;
  }
}