import { z } from 'zod';

export const phoneRegex = /^0[245]\d{8}$/;

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(phoneRegex, 'Invalid Ghana phone number (e.g., 0244123456)');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

export const amountSchema = z.number().min(1, 'Minimum amount is GHS 1').max(10000, 'Maximum amount is GHS 10,000');

export const groupNameSchema = z.string().min(3, 'Group name must be at least 3 characters').max(50, 'Maximum 50 characters');

export const memberCountSchema = z.number().min(2, 'At least 2 members required').max(100, 'Maximum 100 members');

export const otpSchema = z.string().length(6, 'OTP must be 6 digits');

export function validateField(schema: z.ZodSchema, value: any): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Invalid value';
}