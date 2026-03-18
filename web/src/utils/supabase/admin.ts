import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export function isAdmin(userEmail: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !userEmail) return false
  return userEmail.toLowerCase() === adminEmail.toLowerCase()
}
