import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a privileged Supabase client for admin/service operations.
 * This uses the secret key and must only be used in server-side code.
 * Never import this into client components.
 *
 * Note: For auth.admin operations, the legacy service role key is preferred
 * due to current SDK/platform compatibility issues with new secret keys.
 * See: https://github.com/supabase/supabase-js/issues/1568
 *
 * Key priority:
 * 1. SUPABASE_SERVICE_ROLE_KEY (legacy JWT) - preferred for auth.admin operations
 * 2. SUPABASE_SECRET_KEY (new sb_secret_) - fallback for other privileged operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key for auth.admin compatibility
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
