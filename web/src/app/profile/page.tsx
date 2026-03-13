'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, Brain, User, RefreshCw } from 'lucide-react'
import Link from 'next/link'

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

export default function ProfilePage() {
    const [profileMd, setProfileMd] = useState('')
    const [learnedMd, setLearnedMd] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDistilling, setIsDistilling] = useState(false)
    const [saveMessage, setSaveMessage] = useState<string | null>(null)
    const [editingLearned, setEditingLearned] = useState(false)

    useEffect(() => {
        fetchPersona()
    }, [])

    const fetchPersona = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/persona')
            if (res.ok) {
                const data = await res.json()
                // If updated_at is null, they've never saved a profile before, so show the template
                setProfileMd(data.updated_at === null ? DEFAULT_PROFILE : data.profile_md)
                setLearnedMd(data.learned_md || '')
            }
        } catch (err) {
            console.error('Failed to fetch persona:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setSaveMessage(null)
        try {
            const res = await fetch('/api/persona', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_md: profileMd,
                    learned_md: learnedMd
                })
            })
            if (res.ok) {
                setSaveMessage('Saved successfully!')
                setTimeout(() => setSaveMessage(null), 3000)
            } else {
                setSaveMessage('Failed to save')
            }
        } catch (err) {
            setSaveMessage('Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDistill = async () => {
        setIsDistilling(true)
        setSaveMessage(null)
        try {
            const res = await fetch('/api/distill', { method: 'POST' })
            const data = await res.json()
            if (res.ok && data.learned_md) {
                setLearnedMd(data.learned_md)
                setSaveMessage(`Distilled insights from ${data.sessions_analyzed} conversation sessions!`)
                setTimeout(() => setSaveMessage(null), 5000)
            } else {
                setSaveMessage(data.message || data.error || 'Distillation failed')
            }
        } catch (err) {
            setSaveMessage('Distillation failed')
        } finally {
            setIsDistilling(false)
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
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold">My Profile</h1>
                </div>
                <div className="flex items-center gap-2">
                    {saveMessage && (
                        <span className="text-sm text-emerald-400 animate-pulse">{saveMessage}</span>
                    )}
                    <Link href="/profile/interlocutors">
                        <Button variant="outline" className="text-slate-300 border-slate-700 bg-slate-900 rounded-full px-4 hover:bg-slate-800 mr-2">
                             Manage People I Talk To
                        </Button>
                    </Link>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-4"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                    </Button>
                </div>
            </header>

            <div className="max-w-3xl mx-auto p-6 space-y-8">
                {/* Section 1: User Profile */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-lg font-semibold text-slate-200">About Me</h2>
                    </div>
                    <p className="text-sm text-slate-500">
                        Tell us about yourself so we can suggest better sentences. You can add any categories you like that will help the AI understand you — we&apos;ve suggested a few below to get started.
                    </p>
                    <textarea
                        value={profileMd}
                        onChange={(e) => setProfileMd(e.target.value)}
                        className="w-full h-[400px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono resize-y"
                    />
                </section>

                {/* Section 2: Learned Profile */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-400" />
                            <h2 className="text-lg font-semibold text-slate-200">What I&apos;ve Learned</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingLearned(!editingLearned)}
                                className="rounded-full border-slate-700 text-slate-400 hover:text-white text-xs"
                            >
                                {editingLearned ? 'Lock' : 'Edit'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDistill}
                                disabled={isDistilling}
                                className="rounded-full border-purple-800/50 text-purple-400 hover:bg-purple-900/20 text-xs"
                            >
                                {isDistilling ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Distill Now
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">
                        Insights the AI has distilled from your conversations. You can edit or delete anything here.
                    </p>
                    <textarea
                        value={learnedMd}
                        onChange={(e) => setLearnedMd(e.target.value)}
                        readOnly={!editingLearned}
                        placeholder="No insights yet. Use the app for a while, then click 'Distill Now' to generate insights from your conversations."
                        className={`w-full h-[300px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-700 font-mono resize-y
                            ${editingLearned 
                                ? 'focus:outline-none focus:ring-2 focus:ring-purple-500/50' 
                                : 'opacity-75 cursor-default'
                            }`}
                    />
                </section>
            </div>
        </main>
    )
}
