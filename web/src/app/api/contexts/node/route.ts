import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

        const { data, error } = await supabase
            .from('contexts')
            .insert({
                user_id: user.id,
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
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
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

        const updates: any = {}
        if (name !== undefined) updates.name = name.trim()
        if (sort_order !== undefined) updates.sort_order = sort_order

        const { data, error } = await supabase
            .from('contexts')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id) // Security check: must own the record
            .select()
            .single()

        if (error) {
            console.error("Context Update Error:", error)
            return NextResponse.json({ error: 'Failed to update context' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
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

        // Recursively collect all descendant IDs to delete
        const collectIds = async (parentId: string): Promise<string[]> => {
            const { data: children } = await supabase
                .from('contexts')
                .select('id')
                .eq('parent_id', parentId)
                .eq('user_id', user.id)
            
            const childIds = (children || []).map(c => c.id)
            const descendantIds: string[] = []
            for (const childId of childIds) {
                descendantIds.push(childId, ...(await collectIds(childId)))
            }
            return descendantIds
        }

        const allIds = [id, ...(await collectIds(id))]

        // Delete suggestions for all these contexts first
        await supabase
            .from('suggestions')
            .delete()
            .in('context_id', allIds)

        // Delete all the context nodes
        const { error } = await supabase
            .from('contexts')
            .delete()
            .in('id', allIds)
            .eq('user_id', user.id)

        if (error) {
            console.error("Context Delete Error:", error)
            return NextResponse.json({ error: 'Failed to delete context' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
