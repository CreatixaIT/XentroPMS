import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a privileged Supabase client for admin/service operations.
 * This uses the secret key and must only be used in server-side code.
 * Never import this into client components.
 *
 * Note: For auth.admin operations, the legacy service role key is required.
 * The new secret key (sb_secret_) format is not compatible with auth.admin APIs.
 * This function prefers the service role key for compatibility with admin operations.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key for admin operations (required for auth.admin)
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

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
