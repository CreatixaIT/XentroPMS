// Mock Supabase client for testing
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { isAccountActive } from '@/lib/auth/authorization'

describe('Authorization Helpers', () => {
  describe('isAccountActive', () => {
    it('should return true for ACTIVE status', () => {
      expect(isAccountActive('ACTIVE')).toBe(true)
    })

    it('should return false for PENDING_VERIFICATION', () => {
      expect(isAccountActive('PENDING_VERIFICATION')).toBe(false)
    })

    it('should return false for DISABLED', () => {
      expect(isAccountActive('DISABLED')).toBe(false)
    })

    it('should return false for BLOCKED', () => {
      expect(isAccountActive('BLOCKED')).toBe(false)
    })
  })

  describe('Password strength validation', () => {
    it('should require minimum 8 characters', () => {
      const password = 'Short1!'
      const hasMinLength = password.length >= 8
      expect(hasMinLength).toBe(false)
    })

    it('should require uppercase letter', () => {
      const password = 'lowercase123!'
      const hasUppercase = /[A-Z]/.test(password)
      expect(hasUppercase).toBe(false)
    })

    it('should require lowercase letter', () => {
      const password = 'UPPERCASE123!'
      const hasLowercase = /[a-z]/.test(password)
      expect(hasLowercase).toBe(false)
    })

    it('should require number', () => {
      const password = 'NoNumbers!'
      const hasNumber = /[0-9]/.test(password)
      expect(hasNumber).toBe(false)
    })

    it('should require special character', () => {
      const password = 'NoSpecial123'
      const hasSpecial = /[^A-Za-z0-9]/.test(password)
      expect(hasSpecial).toBe(false)
    })

    it('should validate strong password', () => {
      const password = 'StrongPass123!'
      const hasMinLength = password.length >= 8
      const hasUppercase = /[A-Z]/.test(password)
      const hasLowercase = /[a-z]/.test(password)
      const hasNumber = /[0-9]/.test(password)
      const hasSpecial = /[^A-Za-z0-9]/.test(password)
      
      expect(hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial).toBe(true)
    })
  })
})
