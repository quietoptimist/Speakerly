'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, RefreshCw, User, Brain, Plus } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_INTERLOCUTOR_PROFILE = `# About Them
Age:
Occupation:

# Their Interests
(hobbies, favourite topics, things they enjoy talking about)

# How To Talk To Them
(how they like to be addressed, level of formality, tone that works well, any humour or language they appreciate)

# Things To Ask About
(ongoing projects, events, life situations worth following up on)

# Topics To Avoid
(sensitive subjects, things they prefer not to discuss)

# Useful Facts
(anything specific worth remembering — e.g. dietary needs, mobility, preferences)`

interface Interlocutor {
    id: string;
    name: string;
    relationship: string | null;
    profile_md: string;
    learned_md: string;
}

export default function InterlocutorsPage() {
    const [interlocutors, setInterlocutors] = useState<Interlocutor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    
    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftName, setDraftName] = useState('')
    const [draftRel, setDraftRel] = useState('')
    const [draftProfile, setDraftProfile] = useState('')
    const [draftLearned, setDraftLearned] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isLearnedUnlocked, setIsLearnedUnlocked] = useState(false)

    useEffect(() => {
        fetchInterlocutors()
    }, [])

    const fetchInterlocutors = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/interlocutors')
            if (res.ok) {
                const data = await res.json()
                setInterlocutors(data)
            }
        } catch (err: unknown) {
            console.error('Failed to fetch interlocutors:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        setStatusMessage(null)
        try {
            const res = await fetch('/api/interlocutors/sync', { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setStatusMessage(`Synced ${data.count} new people!`)
                if (data.count > 0) fetchInterlocutors();
            } else {
                setStatusMessage('Sync failed')
            }
        } catch {
            setStatusMessage('Sync failed')
        } finally {
            setIsSyncing(false)
            setTimeout(() => setStatusMessage(null), 4000)
        }
    }

    const startEditing = (person?: Interlocutor) => {
        if (person) {
            setEditingId(person.id)
            setDraftName(person.name)
            setDraftRel(person.relationship || '')
            setDraftProfile(person.profile_md || '')
            setDraftLearned(person.learned_md || '')
        } else {
            setEditingId('new')
            setDraftName('')
            setDraftRel('')
            setDraftProfile(DEFAULT_INTERLOCUTOR_PROFILE)
            setDraftLearned('')
        }
        setIsLearnedUnlocked(false)
    }

    const cancelEditing = () => {
        setEditingId(null)
    }

    const handleSave = async () => {
        if (!draftName.trim()) return;
        
        setIsSaving(true)
        try {
            const isNew = editingId === 'new'
            const method = isNew ? 'POST' : 'PUT'
            const payload = {
                id: isNew ? undefined : editingId,
                name: draftName,
                relationship: draftRel,
                profile_md: draftProfile,
                learned_md: draftLearned
            }

            const res = await fetch('/api/interlocutors', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setStatusMessage('Saved successfully!')
                fetchInterlocutors()
                setEditingId(null)
            } else {
                setStatusMessage('Failed to save')
            }
        } catch {
            setStatusMessage('Failed to save')
        } finally {
            setIsSaving(false)
            setTimeout(() => setStatusMessage(null), 3000)
        }
    }

    // A helper function to show the distillation alert if editing a specific person
    const handleDistill = async (id: string) => {
         setStatusMessage('Distilling specifically for this person...')
         try {
             const res = await fetch('/api/distill', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ interlocutor_id: id })
             })
             const data = await res.json()
             if (res.ok && data.learned_md) {
                 setStatusMessage(`Distilled insights from ${data.sessions_analyzed} conversation sessions!`)
                 fetchInterlocutors() // Refresh to show new learned text
             } else {
                 setStatusMessage(data.message || data.error || 'Distillation failed')
             }
         } catch {
             setStatusMessage('Distillation failed')
         } finally {
             setTimeout(() => setStatusMessage(null), 4000)
         }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50">
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <Link href="/profile">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold">Speaking To...</h1>
                </div>
                <div className="flex items-center gap-4">
                    {statusMessage && (
                        <span className="text-sm text-emerald-400 animate-pulse">{statusMessage}</span>
                    )}
                    <Button
                        onClick={handleSync}
                        disabled={isSyncing || editingId !== null}
                        variant="outline"
                        className="border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20 rounded-full px-4"
                    >
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Auto-Import from Profile
                    </Button>
                    <Button
                        onClick={() => startEditing()}
                        disabled={editingId !== null}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                    </Button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-6">
                
                {editingId ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <h2 className="text-lg font-semibold text-slate-200">
                                {editingId === 'new' ? 'Add New Person' : 'Edit Person'}
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={cancelEditing} className="text-slate-400 hover:text-white rounded-full">
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving || !draftName} className="bg-cyan-600 hover:bg-cyan-500 rounded-full">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Name</label>
                                <input
                                    type="text"
                                    value={draftName}
                                    onChange={e => setDraftName(e.target.value)}
                                    placeholder="e.g. John"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Relationship (Optional)</label>
                                <input
                                    type="text"
                                    value={draftRel}
                                    onChange={e => setDraftRel(e.target.value)}
                                    placeholder="e.g. Brother, Doctor"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-cyan-400" />
                                <label className="text-sm text-slate-300 font-medium">About Them</label>
                            </div>
                            <p className="text-xs text-slate-500">Facts about them that might be useful in conversation (hobbies, preferences, etc.)</p>
                            <textarea
                                value={draftProfile}
                                onChange={e => setDraftProfile(e.target.value)}
                                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono focus:border-cyan-500 focus:outline-none resize-y"
                            />
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-purple-400" />
                                    <label className="text-sm text-slate-300 font-medium">What I&apos;ve Learned (AI Distilled)</label>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsLearnedUnlocked(!isLearnedUnlocked)}
                                    className="h-7 text-xs rounded-full border-slate-700 text-slate-400"
                                >
                                    {isLearnedUnlocked ? 'Lock' : 'Unlock to Edit'}
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500">Insights automatically gathered by the AI about how you interact with this person.</p>
                            <textarea
                                value={draftLearned}
                                onChange={e => setDraftLearned(e.target.value)}
                                readOnly={!isLearnedUnlocked}
                                className={`w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono resize-y ${!isLearnedUnlocked ? 'opacity-60 cursor-default' : 'focus:border-purple-500 focus:outline-none'}`}
                            />
                        </div>
                    </div>
                ) : interlocutors.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
                        <User className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">No people added yet</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                            Add the people you talk to most frequently to give the AI specific relational context for suggesting sentences.
                        </p>
                        <Button onClick={handleSync} variant="outline" className="border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20 rounded-full">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Auto-Import from My Profile
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {interlocutors.map(person => (
                            <div key={person.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-semibold text-slate-200">{person.name}</h3>
                                        {person.relationship && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                                {person.relationship}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {person.profile_md ? 'Profile set' : 'No manual profile'}
                                        </span>
                                        <span className="flex items-center gap-1 text-purple-400/70">
                                            <Brain className="h-3 w-3" />
                                            {person.learned_md ? 'AI Insights active' : 'No AI insights yet'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                     <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDistill(person.id)}
                                        className="h-8 rounded-full border-purple-900/50 text-purple-400 hover:bg-purple-900/20 text-xs"
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Distill
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditing(person)}
                                        className="h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                                    >
                                        Edit Profile
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </main>
    )
}
