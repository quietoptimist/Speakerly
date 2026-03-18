import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { copyDefaultsForUser } from '@/lib/contextUtils'

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

    try {
        await copyDefaultsForUser(supabase, user.id)
        return NextResponse.json({ success: true, message: "Successfully copied defaults" })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
1}
