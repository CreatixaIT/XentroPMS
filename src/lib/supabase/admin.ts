import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a privileged Supabase client for admin/service operations.
 * This uses the secret key and must only be used in server-side code.
 * Never import this into client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase admin client requires server configuration')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
