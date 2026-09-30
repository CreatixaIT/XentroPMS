import { registerSchema, loginSchema, changePasswordSchema } from '@/lib/validations/auth'

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        full_name: 'John Doe',
        designation: 'Software Engineer',
        phone: '+8801712345678',
        nid: '1234567890123',
        address: '123 Main St, Dhaka',
        email: 'john@example.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
      }
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject weak password', () => {
      const invalidData = {
        full_name: 'John Doe',
        designation: 'Software Engineer',
        phone: '+8801712345678',
        nid: '1234567890123',
        address: '123 Main St, Dhaka',
        email: 'john@example.com',
        password: 'weak',
        confirm_password: 'weak',
      }
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        full_name: 'John Doe',
        designation: 'Software Engineer',
        phone: '+8801712345678',
        nid: '1234567890123',
        address: '123 Main St, Dhaka',
        email: 'john@example.com',
        password: 'Password123!',
        confirm_password: 'Different123!',
      }
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        full_name: 'John Doe',
        designation: 'Software Engineer',
        phone: '+8801712345678',
        nid: '1234567890123',
        address: '123 Main St, Dhaka',
        email: 'invalid-email',
        password: 'Password123!',
        confirm_password: 'Password123!',
      }
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password',
      }
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password',
      }
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate valid password change', () => {
      const validData = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!',
      }
      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject same password', () => {
      const invalidData = {
        current_password: 'Password123!',
        new_password: 'Password123!',
        confirm_password: 'Password123!',
      }
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'Different123!',
      }
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
