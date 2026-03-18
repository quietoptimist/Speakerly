import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all system contexts + user's own contexts
  const { data: contexts, error } = await supabase
    .from('contexts')
    .select('id, parent_id, name, sort_order, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch user's context dismissals
  const { data: dismissals } = await supabase
    .from('user_context_dismissals')
    .select('context_id')
    .eq('user_id', user.id)

  const dismissedContextIds = new Set((dismissals || []).map(d => d.context_id))

  // Filter out dismissed system contexts (user-owned contexts are never dismissed)
  const filteredContexts = (contexts || []).filter(c => {
    if (c.user_id === null && dismissedContextIds.has(c.id)) return false
    return true
  })

  // Build the nested tree
  const contextMap = new Map()
  filteredContexts.forEach(c => contextMap.set(c.id, { ...c, children: [] }))

  const rootContexts: Record<string, unknown>[] = []
  filteredContexts.forEach(c => {
    if (c.parent_id === null) {
      rootContexts.push(contextMap.get(c.id))
    } else {
      const parent = contextMap.get(c.parent_id)
      if (parent) {
        parent.children.push(contextMap.get(c.id))
      }
    }
  })

  // Fetch suggestions (system + user's own) for these contexts, filtered by dismissals
  const contextIds = filteredContexts.map(c => c.id)

  let suggestions: unknown[] = []
  if (contextIds.length > 0) {
    const { data: suggDismissals } = await supabase
      .from('user_suggestion_dismissals')
      .select('suggestion_id')
      .eq('user_id', user.id)

    const dismissedSuggIds = new Set((suggDismissals || []).map(d => d.suggestion_id))

    const { data: suggData, error: suggError } = await supabase
      .from('suggestions')
      .select('*')
      .in('context_id', contextIds)
      .or(`user_id.is.null,user_id.eq.${user.id}`)

    if (!suggError && suggData) {
      suggestions = suggData.filter(s => !dismissedSuggIds.has(s.id))
    }
  }

  return NextResponse.json({ tree: rootContexts, suggestions })
}
