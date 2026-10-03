'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

export async function register(formData: FormData) {
  const supabase = await createClient()
  
  // Extract and validate form data
  const rawData = {
    full_name: formData.get('full_name'),
    designation: formData.get('designation'),
    phone: formData.get('phone'),
    nid: formData.get('nid'),
    address: formData.get('address'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  }
  
  const validationResult = registerSchema.safeParse(rawData)
  
  if (!validationResult.success) {
    return {
      error: 'Validation failed',
      details: validationResult.error.flatten(),
    }
  }
  
  const data = validationResult.data as RegisterInput
  
  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', data.email)
      .single()
    
    if (existingUser) {
      return {
        error: 'An account with this email already exists',
      }
    }
    
    // Create user with Supabase Auth with auto-confirm
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          designation: data.designation,
          phone: data.phone,
          nid: data.nid,
          address: data.address,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email`,
      },
    })
    
    if (authError) {
      console.error('Auth error:', authError)
      return {
        error: authError.message || 'Failed to create account',
      }
    }

    // Profile is created automatically by the trigger
    // Update profile status to ACTIVE for immediate access
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'ACTIVE' })
        .eq('id', authData.user.id)
      
      if (updateError) {
        console.error('Profile update error:', updateError)
        // Continue anyway - profile exists but might need manual activation
      }
    }
    
    // Sign in the user immediately after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    
    if (signInError) {
      console.error('Auto sign-in error:', signInError)
      return {
        success: true,
        message: 'Registration completed successfully. Please sign in to continue.',
        redirect: '/login',
      }
    }
    
    revalidatePath('/', 'layout')
    return {
      success: true,
      message: 'Registration completed successfully.',
      redirect: '/dashboard',
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      error: 'An unexpected error occurred during registration',
    }
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return {
      error: 'Email and password are required',
    }
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return {
        error: 'Invalid email or password',
      }
    }
    
    // Check user status
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single()
    
    if (profile) {
      if (profile.status === 'PENDING_VERIFICATION') {
        await supabase.auth.signOut()
        return {
          error: 'Please verify your email before signing in',
          redirect: '/verify-email',
        }
      } else if (profile.status === 'DISABLED') {
        await supabase.auth.signOut()
        return {
          error: 'Your account is currently inactive. Please contact an administrator.',
          redirect: '/account-disabled',
        }
      } else if (profile.status === 'BLOCKED') {
        await supabase.auth.signOut()
        return {
          error: 'Your account has been blocked. Please contact an administrator.',
          redirect: '/account-blocked',
        }
      }
    }
    
    revalidatePath('/', 'layout')
    return {
      success: true,
      redirect: '/dashboard',
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      error: 'An unexpected error occurred during login',
    }
  }
}

export async function logout() {
  const supabase = await createClient()
  
  try {
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  } catch (error) {
    console.error('Logout error:', error)
    redirect('/login')
  }
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  
  if (!email) {
    return {
      error: 'Email is required',
    }
  }
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    
    if (error) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      }
    }
    
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    }
  }
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  
  const password = formData.get('password') as string
  const confirm_password = formData.get('confirm_password') as string
  
  if (!password || !confirm_password) {
    return {
      error: 'Password and confirmation are required',
    }
  }
  
  if (password !== confirm_password) {
    return {
      error: 'Passwords do not match',
    }
  }
  
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    })
    
    if (error) {
      return {
        error: error.message || 'Failed to reset password',
      }
    }
    
    return {
      success: true,
      message: 'Password reset successful. Please login with your new password.',
      redirect: '/login',
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      error: 'An unexpected error occurred',
    }
  }
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  
  const current_password = formData.get('current_password') as string
  const new_password = formData.get('new_password') as string
  const confirm_password = formData.get('confirm_password') as string
  
  if (!current_password || !new_password || !confirm_password) {
    return {
      error: 'All password fields are required',
    }
  }
  
  if (new_password !== confirm_password) {
    return {
      error: 'New passwords do not match',
    }
  }
  
  if (current_password === new_password) {
    return {
      error: 'New password must be different from current password',
    }
  }
  
  try {
    // Verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return {
        error: 'User not found',
      }
    }
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    })
    
    if (signInError) {
      return {
        error: 'Current password is incorrect',
      }
    }
    
    // Update password
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    })
    
    if (error) {
      return {
        error: error.message || 'Failed to change password',
      }
    }
    
    return {
      success: true,
      message: 'Password changed successfully',
    }
  } catch (error) {
    console.error('Change password error:', error)
    return {
      error: 'An unexpected error occurred',
    }
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      error: 'User not authenticated',
    }
  }
  
  const full_name = formData.get('full_name') as string
  const designation = formData.get('designation') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        designation,
        phone,
        address,
      })
      .eq('id', user.id)
    
    if (error) {
      return {
        error: error.message || 'Failed to update profile',
      }
    }
    
    return {
      success: true,
      message: 'Profile updated successfully',
    }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      error: 'An unexpected error occurred',
    }
  }
}

export async function resendVerificationEmail(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  
  if (!email) {
    return {
      error: 'Email is required',
    }
  }
  
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email`,
      },
    })
    
    if (error) {
      return {
        error: error.message || 'Failed to resend verification email',
      }
    }
    
    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    }
  } catch (error) {
    console.error('Resend verification error:', error)
    return {
      error: 'An unexpected error occurred',
    }
  }
}
