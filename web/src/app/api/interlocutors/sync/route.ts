import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch the user's profile_md
    const { data: persona } = await supabase
      .from('user_personas')
      .select('profile_md')
      .eq('user_id', user.id)
      .single()

    if (!persona || !persona.profile_md) {
      return NextResponse.json({ success: true, count: 0, message: "No profile found to sync." })
    }

    // 2. Parse the "# People In My Life" section
    const profileText = persona.profile_md
    const peopleSectionRegex = /# People In My Life\n([\s\S]*?)(?=\n#|$)/i
    const match = profileText.match(peopleSectionRegex)
    
    if (!match || !match[1]) {
        return NextResponse.json({ success: true, count: 0, message: "No 'People In My Life' section found." })
    }

    const peopleLines = match[1].trim().split('\n')
    
    // We expect format like: - John (Brother) or - Alice (Doctor)
    const newInterlocutors: { name: string, relationship: string | null }[] = []

    for (const line of peopleLines) {
        // Look for lines starting with hyphen or asterisk
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
             // Extract text after bullet
             let text = line.replace(/^[\-\*\s]+/, '').trim()
             
             // 1. Clean up outer parentheses if they wrap the entire text like: (Manolita, wife)
             if (text.startsWith('(') && text.endsWith(')')) {
                 text = text.substring(1, text.length - 1).trim();
             }

             // 2. Ignore templates or non-data lines from the draft
             if (text.toLowerCase().includes('name, relationship')) continue;
             if (text.toLowerCase().includes('firstname lastname')) continue;

             // 3. Try parsing with various delimiters: "(", ",", or ":"
             const parenMatch = text.match(/^(.*?)\s*\((.*?)\)$/)
             const commaMatch = text.match(/^(.*?)\s*,\s*(.*)$/)
             const colonMatch = text.match(/^(.*?)\s*:\s*(.*)$/)
             
             if (parenMatch) {
                 newInterlocutors.push({
                     name: parenMatch[1].trim(),
                     relationship: parenMatch[2].trim()
                 })
             } else if (commaMatch) {
                 newInterlocutors.push({
                     name: commaMatch[1].trim(),
                     relationship: commaMatch[2].trim()
                 })
             } else if (colonMatch) {
                 newInterlocutors.push({
                     name: colonMatch[1].trim(),
                     relationship: colonMatch[2].trim()
                 })
             } else {
                 // No known delimiters, treat the whole line as the name
                 newInterlocutors.push({
                     name: text,
                     relationship: null
                 })
             }
        }
    }

    if (newInterlocutors.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "No properly formatted people found." })
    }

    // 3. Fetch existing interlocutors to avoid duplicates
    const { data: existing } = await supabase
        .from('interlocutors')
        .select('name')
        .eq('user_id', user.id)

    const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()))

    // 4. Filter out duplicates
    const toInsert = newInterlocutors
        .filter(person => !existingNames.has(person.name.toLowerCase()))
        .map(person => ({
            user_id: user.id,
            name: person.name,
            relationship: person.relationship
        }))

    if (toInsert.length === 0) {
         return NextResponse.json({ success: true, count: 0, message: "All people are already synced." })
    }

    // 5. Bulk insert
    const { error: insertError } = await supabase
        .from('interlocutors')
        .insert(toInsert)

    if (insertError) {
        throw insertError
    }

    return NextResponse.json({ success: true, count: toInsert.length })

  } catch (err: unknown) {
    console.error('Sync failed:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
