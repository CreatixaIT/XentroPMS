import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a privileged Supabase client for admin/service operations.
 * This uses the secret key and must only be used in server-side code.
 * Never import this into client components.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
