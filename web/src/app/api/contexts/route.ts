import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Verify Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch user-specific contexts, OR default contexts if the user has none
  // Since we want users to be able to "reset" branches to defaults, and potentially
  // have a mix of custom and default nodes, a simple approach is:
  // If the user has *no* custom contexts at all, return the defaults.
  // Otherwise, return *only* the user's custom contexts. (The client can explicitly call an API to copy defaults over).
  
  const { data: contexts, error } = await supabase
    .from('contexts')
    .select('id, parent_id, name, sort_order, user_id')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Separate user contexts from system contexts
  const userContexts = contexts?.filter(c => c.user_id === user.id) || []
  const systemContexts = contexts?.filter(c => c.user_id === null) || []

  // If the user has explicitly defined contexts, we only want to build the tree from their contexts.
  // If they have 0, we'll return the system contexts so the UI isn't empty.
  const contextsToUse = userContexts.length > 0 ? userContexts : systemContexts

  // Build the nested tree
  const contextMap = new Map()
  contextsToUse.forEach(c => contextMap.set(c.id, { ...c, children: [] }))

  const rootContexts: Record<string, unknown>[] = []

  contextsToUse.forEach(c => {
    if (c.parent_id === null) {
      rootContexts.push(contextMap.get(c.id))
    } else {
      const parent = contextMap.get(c.parent_id)
      if (parent) {
        parent.children.push(contextMap.get(c.id))
      }
    }
  })

  // Fetch suggestions for contexts being returned
  const contextIds = contextsToUse.map(c => c.id)
  
  let suggestions = []
  if (contextIds.length > 0) {
      const { data: suggData, error: suggError } = await supabase
        .from('suggestions')
        .select('*')
        .in('context_id', contextIds)
        
      if (!suggError && suggData) {
          suggestions = suggData
      }
  }

  return NextResponse.json({
      tree: rootContexts,
      suggestions: suggestions,
      isUsingDefaults: userContexts.length === 0
  })
}

// POST endpoint to handle explicitly copying defaults to the user's profile
export async function POST() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch system defaults
    const { data: unsortedSystemContexts, error: scError } = await supabase
      .from('contexts')
      .select('*')
      .is('user_id', null)
      .order('sort_order', { ascending: true })

    if (scError || !unsortedSystemContexts || unsortedSystemContexts.length === 0) {
        return NextResponse.json({ error: 'Failed to find system defaults' }, { status: 500 })
    }

    // Topologically sort system contexts so parents are inserted before children to avoid FK constraint errors
    type ContextRow = { id: string; parent_id: string | null; name: string; sort_order: number };
    const systemContexts: ContextRow[] = []
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
        if (!addedThisRound) break; // Cyclic reference or orphaned nodes, break to avoid infinite loop
    }
    // Push any remaining orphans at the end just in case
    systemContexts.push(...remaining)

    const { data: systemSuggestions } = await supabase
        .from('suggestions')
        .select('*')
        .in('context_id', systemContexts.map(c => c.id))
    
    // We don't fail if there are no suggestions, just continue.

    // 2. Clear existing user contexts (DANGEROUS but this is a full "Reset to Default" action)
    const { error: deleteError } = await supabase
        .from('contexts')
        .delete()
        .eq('user_id', user.id)

    if (deleteError) {
        return NextResponse.json({ error: 'Failed to clear existing user contexts' }, { status: 500 })
    }

    // 3. Map old ID to new UUID
    const idMap = new Map<string, string>()

    // Supabase JS doesn't have a reliable way to insert nested hierarchies while preserving
    // generated UUIDs securely in a single batch insert, so we'll generate UUIDs locally and insert.
    // Node.js crypto isn't available in Edge runtime, so we use web crypto if needed, 
    // but the Supabase client can generate UUIDs if we let the DB do it. 
    // The easiest way is to insert parents first, then children, etc.

    // Helper to generate a simple UUID for mapping purposes before inserting to DB
    const generateUUID = () => crypto.randomUUID()
    
    // First pass: Assign new IDs
    for (const c of systemContexts) {
        idMap.set(c.id, generateUUID())
    }

    // Prepare inserts
    const contextInserts = systemContexts.map(c => ({
        id: idMap.get(c.id),
        user_id: user.id,
        parent_id: c.parent_id ? idMap.get(c.parent_id) : null,
        name: c.name,
        sort_order: c.sort_order
    }))

    const suggestionInserts = (systemSuggestions || []).map(s => {
        const mappedId = idMap.get(s.context_id);
        if (!mappedId) return null; // Safety check
        return {
            context_id: mappedId,
            type: s.type,
            text: s.text
        };
    }).filter(Boolean); // Clear nulls

    // Execute inserts
    const { error: insertContextError } = await supabase
        .from('contexts')
        .insert(contextInserts)

    if (insertContextError) {
        return NextResponse.json({ error: 'Failed to copy system contexts' }, { status: 500 })
    }

    if (suggestionInserts.length > 0) {
        const { error: insertSuggestionError } = await supabase
            .from('suggestions')
            .insert(suggestionInserts)

        if (insertSuggestionError) {
            // Non-fatal, return warnings
            console.error(insertSuggestionError)
        }
    }

    return NextResponse.json({ success: true, message: "Successfully copied defaults" })
}
