/**
 * Initialize Super Admin
 * 
 * This script creates the initial Super Admin user.
 * It should be run once after setting up the database.
 * 
 * Usage:
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=securepassword npx tsx scripts/init-admin.ts
 * 
 * Security:
 * - Never commit actual values to Git
 * - Password is only used via environment variables
 * - Script checks if admin already exists to prevent duplicates
 * - Uses Supabase Auth for password management (never stored in plain text)
 */

import { loadEnvConfig } from '@next/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Load environment variables from .env.local and other Next.js env files
loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
const adminEmail = process.env.INITIAL_ADMIN_EMAIL
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
  process.exit(1)
}

if (!adminEmail || !adminPassword) {
  console.error('Error: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set')
  process.exit(1)
}

// Use service role client for admin operations
const supabase = createSupabaseClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

// Auth Admin API wrapper using raw fetch to avoid SDK's Authorization: Bearer issue with sb_secret_* keys
// The new sb_secret_* keys are NOT JWTs and must be sent only on the 'apikey' header
async function listUsers() {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      apikey: supabaseSecretKey!,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`List users failed: ${response.status} ${JSON.stringify(error)}`)
  }

  return response.json()
}

async function createUser(userData: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: supabaseSecretKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Create user failed: ${response.status} ${JSON.stringify(error)}`)
  }

  return response.json()
}

async function initializeAdmin() {
  console.log('Starting Super Admin initialization...')
  console.log(`Admin email: ${adminEmail}`)

  try {
    // Check if admin already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', adminEmail)
      .single()

    if (existingProfile) {
      console.log('Admin already exists with email:', adminEmail)
      console.log('Role:', existingProfile.role)
      
      if (existingProfile.role === 'SUPER_ADMIN') {
        console.log('✓ Super Admin already initialized')
        process.exit(0)
      } else {
        console.log('⚠ User exists but is not SUPER_ADMIN. Updating role...')
        
        // Update role to SUPER_ADMIN
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'SUPER_ADMIN', status: 'ACTIVE' })
          .eq('id', existingProfile.id)
        
        if (updateError) {
          console.error('Error updating role:', updateError)
          process.exit(1)
        }
        
        console.log('✓ Role updated to SUPER_ADMIN')
        process.exit(0)
      }
    }

    // Check if user exists in Auth using raw fetch
    console.log('Checking if user exists in Supabase Auth...')
    const existingUsers = await listUsers()
    const existingAuthUser = existingUsers.users.find((u: { email: string }) => u.email === adminEmail)

    if (existingAuthUser) {
      console.log('User already exists in Supabase Auth:', adminEmail)
      console.log('User ID:', existingAuthUser.id)
      
      // Create profile for existing auth user
      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert({
          id: existingAuthUser.id,
          email: adminEmail,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          full_name: 'Super Admin',
          designation: 'System Administrator',
        })

      if (profileCreateError) {
        console.error('Error creating profile for existing user:', profileCreateError)
        // Profile might already exist, try updating instead
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            full_name: 'Super Admin',
            designation: 'System Administrator',
          })
          .eq('id', existingAuthUser.id)

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError)
          process.exit(1)
        }
      }

      console.log('✓ Profile created/updated for existing auth user')
      console.log('✓ Super Admin initialization complete')
      process.exit(0)
    }

    // Create admin user with Supabase Auth using raw fetch
    console.log('Creating auth user...')
    const authData = await createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin',
        designation: 'System Administrator',
        phone: '',
        nid: '',
        address: '',
      },
    })

    console.log('✓ Auth user created')
    console.log('User ID:', authData.id)

    // Update profile to SUPER_ADMIN and ACTIVE status
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        full_name: 'Super Admin',
        designation: 'System Administrator',
      })
      .eq('id', authData.id)

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError)
      process.exit(1)
    }

    console.log('✓ Profile updated to SUPER_ADMIN')
    console.log('✓ Super Admin initialization complete')
    console.log('\nIMPORTANT: Please change the admin password after first login!')
    
  } catch (error) {
    console.error('Error during initialization:', error)
    process.exit(1)
  }
}

initializeAdmin()
