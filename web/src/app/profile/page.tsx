'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, Brain, User, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/app/login/actions'

const DEFAULT_PROFILE = `# About Me
Name:
Age:

# People In My Life
- FirstName LastName, (brother)
- FirstName, wife
- FirstName LastName (sister)
- FirstName, caregiver

# My Interests
(hobbies, favourite topics, things you enjoy)

# How I Like To Communicate
(your tone, humour, vocabulary level, communication style)

# Daily Routine
(typical day structure, mealtimes, activities)

# Food & Drink Preferences
(favourite foods, drinks, dietary requirements)

# Allergies
(any allergies or intolerances)

# Important Medical
(relevant medical conditions, medications, mobility needs)

# Phrases I Use Often
- "..."
- "..."`

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
    id: string
    name: string
    relationship: string | null
    profile_md: string
    learned_md: string
}

export default function ProfilesPage() {
    // Settings state
    const [wordCount, setWordCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 10
        return parseInt(localStorage.getItem('speakerly_word_count') || '10', 10)
    })
    const [isResettingContext, setIsResettingContext] = useState(false)

    const handleWordCountChange = (value: number) => {
        setWordCount(value)
        localStorage.setItem('speakerly_word_count', String(value))
    }

    const handleResetContext = async () => {
        setIsResettingContext(true)
        try {
            const res = await fetch('/api/contexts', { method: 'POST' })
            if (res.ok) showStatus('Context reset to defaults')
            else showStatus('Reset failed')
        } catch {
            showStatus('Reset failed')
        } finally {
            setIsResettingContext(false)
        }
    }

    // About Me state
    const [isAboutMeExpanded, setIsAboutMeExpanded] = useState(false)
    const [profileMd, setProfileMd] = useState('')
    const [learnedMd, setLearnedMd] = useState('')
    const [isProfileLoading, setIsProfileLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isDistillingUser, setIsDistillingUser] = useState(false)
    const [editingLearnedUser, setEditingLearnedUser] = useState(false)

    // Interlocutors state
    const [interlocutors, setInterlocutors] = useState<Interlocutor[]>([])
    const [isInterlocutorsLoading, setIsInterlocutorsLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [draftName, setDraftName] = useState('')
    const [draftRel, setDraftRel] = useState('')
    const [draftProfile, setDraftProfile] = useState('')
    const [draftLearned, setDraftLearned] = useState('')
    const [isSavingPerson, setIsSavingPerson] = useState(false)
    const [isLearnedUnlocked, setIsLearnedUnlocked] = useState(false)

    // Shared status
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    useEffect(() => {
        fetchPersona()
        fetchInterlocutors()
    }, [])

    const showStatus = (msg: string, duration = 3000) => {
        setStatusMessage(msg)
        setTimeout(() => setStatusMessage(null), duration)
    }

    // ── User profile ──────────────────────────────────────────

    const fetchPersona = async () => {
        setIsProfileLoading(true)
        try {
            const res = await fetch('/api/persona')
            if (res.ok) {
                const data = await res.json()
                setProfileMd(data.updated_at === null ? DEFAULT_PROFILE : data.profile_md)
                setLearnedMd(data.learned_md || '')
            }
        } catch (err) {
            console.error('Failed to fetch persona:', err)
        } finally {
            setIsProfileLoading(false)
        }
    }

    const handleSaveProfile = async () => {
        setIsSavingProfile(true)
        try {
            const res = await fetch('/api/persona', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_md: profileMd, learned_md: learnedMd })
            })
            showStatus(res.ok ? 'Saved!' : 'Failed to save')
        } catch {
            showStatus('Failed to save')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleDistillUser = async () => {
        setIsDistillingUser(true)
        try {
            const res = await fetch('/api/distill', { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.learned_md) {
                setLearnedMd(data.learned_md)
                showStatus(`Distilled insights from ${data.sessions_analyzed} sessions!`, 5000)
            } else {
                showStatus(data.message || data.error || 'Distillation failed')
            }
        } catch {
            showStatus('Distillation failed')
        } finally {
            setIsDistillingUser(false)
        }
    }

    // ── Interlocutors ─────────────────────────────────────────

    const fetchInterlocutors = async () => {
        setIsInterlocutorsLoading(true)
        try {
            const res = await fetch('/api/interlocutors')
            if (res.ok) setInterlocutors(await res.json())
        } catch (err) {
            console.error('Failed to fetch interlocutors:', err)
        } finally {
            setIsInterlocutorsLoading(false)
        }
    }

    const handleDeletePerson = async (id: string) => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/interlocutors?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                showStatus('Deleted')
                setEditingId(null)
                setConfirmDeleteId(null)
                fetchInterlocutors()
            } else {
                showStatus('Failed to delete')
            }
        } catch {
            showStatus('Failed to delete')
        } finally {
            setIsDeleting(false)
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

    const handleSavePerson = async () => {
        if (!draftName.trim()) return
        setIsSavingPerson(true)
        try {
            const isNew = editingId === 'new'
            const res = await fetch('/api/interlocutors', {
                method: isNew ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: isNew ? undefined : editingId,
                    name: draftName,
                    relationship: draftRel,
                    profile_md: draftProfile,
                    learned_md: draftLearned
                })
            })
            if (res.ok) {
                showStatus('Saved!')
                fetchInterlocutors()
                setEditingId(null)
            } else {
                showStatus('Failed to save')
            }
        } catch {
            showStatus('Failed to save')
        } finally {
            setIsSavingPerson(false)
        }
    }

    const handleDistillPerson = async (id: string) => {
        showStatus('Distilling...')
        try {
            const res = await fetch('/api/distill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interlocutor_id: id })
            })
            const data = await res.json()
            if (res.ok && data.learned_md) {
                setDraftLearned(data.learned_md)
                showStatus(`Distilled insights from ${data.sessions_analyzed} sessions!`, 5000)
                fetchInterlocutors()
            } else {
                showStatus(data.message || data.error || 'Distillation failed')
            }
        } catch {
            showStatus('Distillation failed')
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold">Profiles</h1>
                </div>
                <div className="flex items-center gap-3">
                    {statusMessage && (
                        <span className="text-sm text-emerald-400 animate-pulse">{statusMessage}</span>
                    )}
                    <form action={logout}>
                        <Button variant="outline" size="sm" className="rounded-full border-slate-700 text-slate-400 hover:text-white text-xs">
                            Sign Out
                        </Button>
                    </form>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-6 space-y-0">

                {/* ── Settings ─────────────────────────────── */}
                <section className="py-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
                    </div>

                    {/* Word count */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-300">Suggested Topics Word Count</p>
                            <p className="text-xs text-slate-500 mt-0.5">Number of words shown in the Statements and Questions columns.</p>
                        </div>
                        <select
                            value={wordCount}
                            onChange={e => handleWordCountChange(Number(e.target.value))}
                            className="ml-4 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                            {[5, 10, 15, 20].map(n => (
                                <option key={n} value={n}>{n} words</option>
                            ))}
                        </select>
                    </div>

                    {/* Reset context */}
                    <div className="flex items-start justify-between pt-1">
                        <div>
                            <p className="text-sm text-slate-300">Reset Situational Context</p>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-xs">Removes all customised context options and restores the default set.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetContext}
                            disabled={isResettingContext}
                            className="ml-4 shrink-0 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-800/50 rounded-full text-xs h-8"
                        >
                            {isResettingContext ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Reset to Defaults
                        </Button>
                    </div>
                </section>

                <div className="border-t border-slate-800" />

                {/* ── About Me ─────────────────────────────── */}
                <section>
                    {/* Collapsed header — always visible */}
                    <button
                        onClick={() => setIsAboutMeExpanded(v => !v)}
                        className="w-full flex items-center justify-between py-4 text-left group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <User className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">About Me</p>
                                <p className="text-xs text-slate-500">Tell me about yourself so I can suggest better sentences</p>
                            </div>
                        </div>
                        {isAboutMeExpanded
                            ? <ChevronUp className="h-4 w-4 text-slate-500" />
                            : <ChevronDown className="h-4 w-4 text-slate-500" />
                        }
                    </button>

                    {/* Expanded content */}
                    {isAboutMeExpanded && (
                        <div className="pb-6 space-y-6">
                            {isProfileLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-slate-500" /></div>
                            ) : (
                                <>
                                    {/* Profile text */}
                                    <div className="space-y-2">
                                        <textarea
                                            value={profileMd}
                                            onChange={(e) => setProfileMd(e.target.value)}
                                            className="w-full h-[380px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono resize-y"
                                        />
                                    </div>

                                    {/* Learned profile */}
                                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Brain className="h-4 w-4 text-purple-400" />
                                                <span className="text-sm font-medium text-slate-300">What I've Learned</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setEditingLearnedUser(v => !v)}
                                                    className="rounded-full border-slate-700 text-slate-400 hover:text-white text-xs h-7">
                                                    {editingLearnedUser ? 'Lock' : 'Edit'}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleDistillUser} disabled={isDistillingUser}
                                                    className="rounded-full border-purple-800/50 text-purple-400 hover:bg-purple-900/20 text-xs h-7">
                                                    {isDistillingUser ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                                    Distill Now
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">Insights the AI has distilled from your conversations.</p>
                                        <textarea
                                            value={learnedMd}
                                            onChange={(e) => setLearnedMd(e.target.value)}
                                            readOnly={!editingLearnedUser}
                                            placeholder="No insights yet. Use the app for a while, then click 'Distill Now'."
                                            className={`w-full h-[240px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-700 font-mono resize-y
                                                ${editingLearnedUser ? 'focus:outline-none focus:ring-2 focus:ring-purple-500/50' : 'opacity-60 cursor-default'}`}
                                        />
                                    </div>

                                    {/* Save button */}
                                    <div className="flex justify-end">
                                        <Button onClick={handleSaveProfile} disabled={isSavingProfile}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-6">
                                            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                            Save Profile
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {/* ── Divider ──────────────────────────────── */}
                <div className="border-t border-slate-800" />

                {/* ── People I Talk To ─────────────────────── */}
                <section className="pt-6 space-y-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-200">People I Talk To</h2>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                                Add profiles for the people you talk to regularly. The AI uses these to tailor suggestions for each conversation.
                            </p>
                        </div>
                        <Button onClick={() => startEditing()} disabled={editingId !== null}
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs h-8 shrink-0 ml-4">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Person
                        </Button>
                    </div>

                    {/* Edit form */}
                    {editingId && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <h3 className="text-sm font-semibold text-slate-200">
                                    {editingId === 'new' ? 'Add New Person' : 'Edit Person'}
                                </h3>
                                <div className="flex gap-2 items-center">
                                    {editingId !== 'new' && (
                                        confirmDeleteId === editingId ? (
                                            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 rounded-full px-3 py-1">
                                                <span className="text-xs text-red-300">Delete this person?</span>
                                                <button onClick={() => handleDeletePerson(editingId!)} disabled={isDeleting}
                                                    className="text-xs font-semibold text-red-400 hover:text-red-300">
                                                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes, delete'}
                                                </button>
                                                <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500 hover:text-slate-300">
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(editingId)}
                                                className="text-slate-600 hover:text-red-400 hover:bg-red-950/30 rounded-full text-xs h-8">
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Delete
                                            </Button>
                                        )
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setConfirmDeleteId(null); }}
                                        className="text-slate-400 hover:text-white rounded-full text-xs h-8">
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSavePerson} disabled={isSavingPerson || !draftName}
                                        className="bg-cyan-600 hover:bg-cyan-500 rounded-full text-xs h-8">
                                        {isSavingPerson ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                        Save
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400">Name</label>
                                    <input type="text" value={draftName} onChange={e => setDraftName(e.target.value)}
                                        placeholder="e.g. John"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400">Relationship (optional)</label>
                                    <input type="text" value={draftRel} onChange={e => setDraftRel(e.target.value)}
                                        placeholder="e.g. Brother, Doctor"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-cyan-400" />
                                    <label className="text-xs font-medium text-slate-300">About Them</label>
                                </div>
                                <p className="text-xs text-slate-500">Facts that might be useful in conversation.</p>
                                <textarea value={draftProfile} onChange={e => setDraftProfile(e.target.value)}
                                    className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono focus:border-cyan-500 focus:outline-none resize-y" />
                            </div>

                            <div className="space-y-1.5 pt-4 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-3.5 w-3.5 text-purple-400" />
                                        <label className="text-xs font-medium text-slate-300">What I've Learned (AI Distilled)</label>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingId !== 'new' && (
                                            <Button variant="outline" size="sm"
                                                onClick={() => handleDistillPerson(editingId!)}
                                                className="h-7 text-xs rounded-full border-purple-900/50 text-purple-400 hover:bg-purple-900/20">
                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                Distill
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm"
                                            onClick={() => setIsLearnedUnlocked(v => !v)}
                                            className="h-7 text-xs rounded-full border-slate-700 text-slate-400">
                                            {isLearnedUnlocked ? 'Lock' : 'Unlock to Edit'}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">Insights automatically gathered by the AI.</p>
                                <textarea value={draftLearned} onChange={e => setDraftLearned(e.target.value)}
                                    readOnly={!isLearnedUnlocked}
                                    placeholder="No insights yet. Save this person, then click Distill."
                                    className={`w-full h-36 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono resize-y
                                        ${isLearnedUnlocked ? 'focus:border-purple-500 focus:outline-none' : 'opacity-60 cursor-default'}`} />
                            </div>
                        </div>
                    )}

                    {/* People list */}
                    {!editingId && (
                        isInterlocutorsLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-slate-500" /></div>
                        ) : interlocutors.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                                <User className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                                <p className="text-sm text-slate-400 mb-1">No people added yet</p>
                                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                                    Click "Add Person" to create a profile for someone you talk to regularly.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/60">
                                {interlocutors.map(person => (
                                    <div key={person.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-slate-200">{person.name}</span>
                                                {person.relationship && (
                                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                                        {person.relationship}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => startEditing(person)}
                                            className="text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-full h-7">
                                            Edit Profile
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </section>

            </div>
        </main>
    )
}
