import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Clones all system default contexts (user_id IS NULL) into user-owned copies,
 * replacing any existing user contexts. Also copies associated suggestions.
 * Returns a Map from old system context IDs to new user-owned IDs.
 */
export async function copyDefaultsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Map<string, string>> {
  // 1. Fetch system defaults
  const { data: unsortedSystemContexts, error: scError } = await supabase
    .from('contexts')
    .select('*')
    .is('user_id', null)
    .order('sort_order', { ascending: true })

  if (scError || !unsortedSystemContexts || unsortedSystemContexts.length === 0) {
    throw new Error('Failed to find system defaults')
  }

  // Topologically sort so parents are inserted before children
  const systemContexts: any[] = []
  const remaining = [...unsortedSystemContexts]
  const insertedIds = new Set<string>()

  while (remaining.length > 0) {
    let addedThisRound = false
    for (let i = remaining.length - 1; i >= 0; i--) {
      const c = remaining[i]
      if (c.parent_id === null || insertedIds.has(c.parent_id)) {
        systemContexts.push(c)
        insertedIds.add(c.id)
        remaining.splice(i, 1)
        addedThisRound = true
      }
    }
    if (!addedThisRound) break
  }
  systemContexts.push(...remaining)

  const { data: systemSuggestions } = await supabase
    .from('suggestions')
    .select('*')
    .in('context_id', systemContexts.map((c: any) => c.id))

  // 2. Clear existing user contexts
  const { error: deleteError } = await supabase
    .from('contexts')
    .delete()
    .eq('user_id', userId)

  if (deleteError) throw new Error('Failed to clear existing user contexts')

  // 3. Map old IDs to new UUIDs and insert
  const idMap = new Map<string, string>()
  for (const c of systemContexts) {
    idMap.set(c.id, crypto.randomUUID())
  }

  const contextInserts = systemContexts.map((c: any) => ({
    id: idMap.get(c.id),
    user_id: userId,
    parent_id: c.parent_id ? idMap.get(c.parent_id) : null,
    name: c.name,
    sort_order: c.sort_order,
  }))

  const { error: insertContextError } = await supabase
    .from('contexts')
    .insert(contextInserts)

  if (insertContextError) throw new Error('Failed to copy system contexts')

  const suggestionInserts = (systemSuggestions || [])
    .map((s: any) => {
      const mappedId = idMap.get(s.context_id)
      if (!mappedId) return null
      return { context_id: mappedId, type: s.type, text: s.text }
    })
    .filter(Boolean)

  if (suggestionInserts.length > 0) {
    await supabase.from('suggestions').insert(suggestionInserts)
  }

  return idMap
}
