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

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.INITIAL_ADMIN_EMAIL
const adminPassword = process.env.INITIAL_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set')
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

async function initializeAdmin() {
  console.log('Starting Super Admin initialization...')
  console.log(`Admin email: ${adminEmail}`)

  try {
    // Check if admin already exists
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

    // Create admin user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        full_name: 'Super Admin',
        designation: 'System Administrator',
        phone: '',
        nid: '',
        address: '',
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      process.exit(1)
    }

    console.log('✓ Auth user created')

    // Update profile to SUPER_ADMIN and ACTIVE status
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        full_name: 'Super Admin',
        designation: 'System Administrator',
      })
      .eq('id', authData.user.id)

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
