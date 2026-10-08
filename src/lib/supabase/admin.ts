import 'server-only'

/**
 * This file is deprecated. Use createAdminClient from @/lib/supabase/server instead.
 * The actual implementation uses SUPABASE_SERVICE_ROLE_KEY as it should.
 */

export { createAdminClient } from './server'
