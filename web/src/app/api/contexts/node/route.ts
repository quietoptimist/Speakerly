import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient, isAdmin } from '@/utils/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { parent_id, name, sort_order } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 })
    }

    const admin = isAdmin(user.email)
    const client = admin ? createAdminClient() : supabase

    const { data, error } = await client
      .from('contexts')
      .insert({
        user_id: admin ? null : user.id,
        parent_id: parent_id || null,
        name: name.trim(),
        sort_order: sort_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error("Context Insert Error:", error)
      return NextResponse.json({ error: 'Failed to create context' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updates: Record<string, string | number> = {}
    if (name !== undefined) updates.name = name.trim()
    if (sort_order !== undefined) updates.sort_order = sort_order

    const admin = isAdmin(user.email)

    if (admin) {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('contexts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error("Context Update Error:", error)
        return NextResponse.json({ error: 'Failed to update context' }, { status: 500 })
      }
      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('contexts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error("Context Update Error:", error)
      return NextResponse.json({ error: 'Failed to update context' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Fetch the target context to check ownership
    const { data: ctx } = await supabase
      .from('contexts')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!ctx) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }

    const admin = isAdmin(user.email)

    if (ctx.user_id === null) {
      // System context
      if (admin) {
        // Admin hard-deletes system contexts (cascade handles suggestions)
        const adminClient = createAdminClient()
        const { error } = await adminClient
          .from('contexts')
          .delete()
          .eq('id', id)

        if (error) {
          console.error("Admin Context Delete Error:", error)
          return NextResponse.json({ error: 'Failed to delete context' }, { status: 500 })
        }
      } else {
        // Non-admin: soft dismiss this and all descendant system contexts
        const collectSystemDescendants = async (parentId: string): Promise<string[]> => {
          const { data: children } = await supabase
            .from('contexts')
            .select('id')
            .eq('parent_id', parentId)
            .is('user_id', null)

          const childIds = (children || []).map(c => c.id)
          const allDescendants: string[] = []
          for (const childId of childIds) {
            allDescendants.push(childId, ...(await collectSystemDescendants(childId)))
          }
          return allDescendants
        }

        const allIds = [id, ...(await collectSystemDescendants(id))]
        const dismissals = allIds.map(context_id => ({ user_id: user.id, context_id }))

        const { error } = await supabase
          .from('user_context_dismissals')
          .upsert(dismissals, { onConflict: 'user_id,context_id' })

        if (error) {
          console.error("Context Dismissal Error:", error)
          return NextResponse.json({ error: 'Failed to dismiss context' }, { status: 500 })
        }
      }
    } else if (ctx.user_id === user.id) {
      // User-owned context: hard delete with descendants
      const collectDescendants = async (parentId: string): Promise<string[]> => {
        const { data: children } = await supabase
          .from('contexts')
          .select('id')
          .eq('parent_id', parentId)
          .eq('user_id', user.id)

        const childIds = (children || []).map(c => c.id)
        const allDescendants: string[] = []
        for (const childId of childIds) {
          allDescendants.push(childId, ...(await collectDescendants(childId)))
        }
        return allDescendants
      }

      const allIds = [id, ...(await collectDescendants(id))]

      await supabase.from('suggestions').delete().in('context_id', allIds).eq('user_id', user.id)

      const { error } = await supabase
        .from('contexts')
        .delete()
        .in('id', allIds)
        .eq('user_id', user.id)

      if (error) {
        console.error("Context Delete Error:", error)
        return NextResponse.json({ error: 'Failed to delete context' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
