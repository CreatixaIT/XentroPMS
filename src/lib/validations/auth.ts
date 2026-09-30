import { z } from 'zod'

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// Registration schema
export const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  designation: z
    .string()
    .min(2, 'Designation is required')
    .max(100, 'Designation must not exceed 100 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^[0-9+]+$/, 'Phone number must contain only digits and +'),
  nid: z
    .string()
    .min(10, 'NID must be at least 10 characters')
    .max(20, 'NID must not exceed 20 characters'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type RegisterInput = z.infer<typeof registerSchema>

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// Reset password schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Change password schema
export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
}).refine((data) => data.current_password !== data.new_password, {
  message: 'New password must be different from current password',
  path: ['new_password'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// Profile update schema
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  designation: z
    .string()
    .min(2, 'Designation is required')
    .max(100, 'Designation must not exceed 100 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must not exceed 15 digits')
    .regex(/^[0-9+]+$/, 'Phone number must contain only digits and +'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters'),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z
    .string()
    .min(1, 'Verification code is required'),
})

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
