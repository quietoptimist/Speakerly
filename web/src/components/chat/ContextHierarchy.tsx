'use client'

import React, { useState, useEffect } from "react"
import { ChevronRight, Loader2, X, Edit, Plus, Pencil, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ContextNode {
    id: string;
    parent_id: string | null;
    user_id: string | null;
    name: string;
    sort_order: number;
    children: ContextNode[];
}

export interface ContextSuggestion {
    id: string;
    context_id: string;
    type: 'keyword' | 'sentence';
    text: string;
    user_id?: string | null;
}

interface EditSuggestion extends ContextSuggestion {
    user_id: string | null;
    dismissed?: boolean;
}

interface ContextHierarchyProps {
    activeContextPath: ContextNode[];
    setActiveContextPath: (path: ContextNode[]) => void;
    onSuggestionsChange?: (suggestions: ContextSuggestion[]) => void;
    isAdmin?: boolean;
}

export function ContextHierarchy({ activeContextPath, setActiveContextPath, onSuggestionsChange, isAdmin = false }: ContextHierarchyProps) {
    const [tree, setTree] = useState<ContextNode[]>([])
    const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Node editing states
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")
    const [addingToLevel, setAddingToLevel] = useState<number | null>(null)
    const [, setAddingParentId] = useState<string | null>(null)
    const [addValue, setAddValue] = useState("")
    const [isMutating, setIsMutating] = useState(false)

    // Suggestions editor states
    const [isEditingSuggestions, setIsEditingSuggestions] = useState(false)
    const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([])
    const [pendingDismissals, setPendingDismissals] = useState<Set<string>>(new Set())
    const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())
    const [pendingNewKeywords, setPendingNewKeywords] = useState<string[]>([])
    const [pendingNewSentences, setPendingNewSentences] = useState<string[]>([])
    const [newKeyword, setNewKeyword] = useState("")
    const [newSentence, setNewSentence] = useState("")
    const [isSavingSuggestions, setIsSavingSuggestions] = useState(false)
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/contexts')
            if (!res.ok) throw new Error("Failed to load contexts")
            const data = await res.json()
            setTree(data.tree)
            setSuggestions(data.suggestions)

            if (activeContextPath.length > 0) {
                const findNode = (nodes: ContextNode[], id: string): ContextNode | null => {
                    for (const n of nodes) {
                        if (n.id === id) return n
                        const found = findNode(n.children || [], id)
                        if (found) return found
                    }
                    return null
                }
                const newPath: ContextNode[] = []
                for (const pathNode of activeContextPath) {
                    const match = findNode(data.tree, pathNode.id)
                    if (match) newPath.push(match)
                    else break
                }
                setActiveContextPath(newPath)
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (onSuggestionsChange) {
            if (activeContextPath.length > 0) {
                const currentId = activeContextPath[activeContextPath.length - 1].id
                const activeSuggestions = suggestions.filter(s => s.context_id === currentId)
                onSuggestionsChange(activeSuggestions)
            } else {
                onSuggestionsChange([])
            }
        }
    }, [activeContextPath, suggestions])

    const handleSelect = (level: number, node: ContextNode) => {
        if (addingToLevel !== null) setAddingToLevel(null)
        if (isEditingSuggestions) resetEditState()
        const newPath = activeContextPath.slice(0, level)
        setActiveContextPath([...newPath, node])
    }

    const handleAddSubmit = async (level: number, parentId: string | null) => {
        if (!addValue.trim()) { setAddingToLevel(null); return }
        setIsMutating(true)
        setError(null)
        try {
            const res = await fetch('/api/contexts/node', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: parentId, name: addValue.trim() })
            })
            if (!res.ok) throw new Error("Failed to create option")
            await fetchData()
            setAddValue("")
            setAddingToLevel(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsMutating(false)
        }
    }

    const handleEditSubmit = async (id: string) => {
        if (!editValue.trim()) { setEditingNodeId(null); return }
        setIsMutating(true)
        setError(null)
        try {
            const res = await fetch('/api/contexts/node', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: editValue.trim() })
            })
            if (!res.ok) throw new Error("Failed to update option")
            await fetchData()
            setEditingNodeId(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsMutating(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Delete this option and all its sub-options?")) return
        setIsMutating(true)
        setError(null)
        try {
            const res = await fetch(`/api/contexts/node?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error("Failed to delete option")
            if (activeContextPath.some(n => n.id === id)) {
                const idx = activeContextPath.findIndex(n => n.id === id)
                setActiveContextPath(activeContextPath.slice(0, idx))
            }
            await fetchData()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsMutating(false)
        }
    }

    // Suggestions editor helpers
    const openSuggestionsEditor = async () => {
        const currentId = activeContextPath[activeContextPath.length - 1].id
        setIsLoadingSuggestions(true)
        setError(null)
        try {
            const res = await fetch(`/api/contexts/suggestions?context_id=${currentId}`)
            if (!res.ok) throw new Error("Failed to load suggestions")
            const data: EditSuggestion[] = await res.json()
            setEditSuggestions(data)
            setIsEditingSuggestions(true)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsLoadingSuggestions(false)
        }
    }

    const resetEditState = () => {
        setIsEditingSuggestions(false)
        setEditSuggestions([])
        setPendingDismissals(new Set())
        setPendingDeletes(new Set())
        setPendingNewKeywords([])
        setPendingNewSentences([])
        setNewKeyword("")
        setNewSentence("")
    }

    const toggleDismissal = (id: string) => {
        setPendingDismissals(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const addNewSuggestion = (type: 'keyword' | 'sentence') => {
        if (type === 'keyword') {
            if (!newKeyword.trim()) return
            setPendingNewKeywords(prev => [...prev, newKeyword.trim()])
            setNewKeyword("")
        } else {
            if (!newSentence.trim()) return
            setPendingNewSentences(prev => [...prev, newSentence.trim()])
            setNewSentence("")
        }
    }

    const handleSaveSuggestions = async () => {
        const currentId = activeContextPath[activeContextPath.length - 1].id
        setIsSavingSuggestions(true)
        setError(null)
        try {
            const doFetch = async (url: string, opts: RequestInit) => {
                const res = await fetch(url, opts)
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error || `Request failed: ${res.status}`)
                }
                return res
            }

            const ops: Promise<Response>[] = []

            // POST new suggestions
            for (const text of pendingNewKeywords) {
                ops.push(doFetch('/api/contexts/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context_id: currentId, type: 'keyword', text })
                }))
            }
            for (const text of pendingNewSentences) {
                ops.push(doFetch('/api/contexts/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context_id: currentId, type: 'sentence', text })
                }))
            }

            // DELETE dismissed system suggestions + delete user-owned suggestions
            for (const id of [...pendingDismissals, ...pendingDeletes]) {
                ops.push(doFetch(`/api/contexts/suggestions?id=${id}`, { method: 'DELETE' }))
            }

            await Promise.all(ops)
            await fetchData()
            resetEditState()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsSavingSuggestions(false)
        }
    }

    const layersToDisplay: { nodes: ContextNode[], level: number, parentId: string | null }[] = [
        { nodes: tree, level: 0, parentId: null }
    ]

    activeContextPath.forEach((node, index) => {
        if (node.children && node.children.length > 0) {
            layersToDisplay.push({ nodes: node.children, level: index + 1, parentId: node.id })
        } else {
            layersToDisplay.push({ nodes: [], level: index + 1, parentId: node.id })
        }
    })

    if (isLoading) {
        return <div className="flex justify-center p-4 text-slate-500"><Loader2 className="animate-spin h-5 w-5" /></div>
    }

    const currentContextId = activeContextPath.length > 0 ? activeContextPath[activeContextPath.length - 1].id : null

    // Suggestions in editor (filter out pending deletes from display)
    const visibleEditSuggestions = editSuggestions.filter(s => !pendingDeletes.has(s.id))
    const editKeywords = visibleEditSuggestions.filter(s => s.type === 'keyword')
    const editSentences = visibleEditSuggestions.filter(s => s.type === 'sentence')

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-2.5 space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-slate-300">Situational Context</h3>
                    {isAdmin && (
                        <span className="text-[10px] font-semibold text-purple-400 border border-purple-600/50 rounded px-1.5 py-0.5">Admin</span>
                    )}
                </div>
                <div className="flex gap-1.5 items-center">
                    {currentContextId && !isEditingSuggestions && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openSuggestionsEditor}
                            disabled={isLoadingSuggestions}
                            className="h-7 text-xs border-cyan-800/50 hover:bg-cyan-900/20 text-cyan-400"
                        >
                            {isLoadingSuggestions
                                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                : <Pencil className="h-3 w-3 mr-1" />}
                            Edit Suggestions
                        </Button>
                    )}
                    {isEditingSuggestions && (
                        <>
                            <Button
                                size="sm"
                                onClick={handleSaveSuggestions}
                                disabled={isSavingSuggestions}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                            >
                                {isSavingSuggestions && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetEditState}
                                disabled={isSavingSuggestions}
                                className="h-7 text-xs text-slate-400 hover:text-slate-200"
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="text-red-400 text-xs">{error}</div>}

            {/* Context layers */}
            <div className="space-y-1.5">
                {layersToDisplay.map((layer, idx) => (
                    <div key={`layer-${idx}`} className="flex flex-wrap items-center gap-1.5">
                        {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />}

                        {layer.nodes.map(node => {
                            const isSelected = activeContextPath[idx]?.id === node.id

                            if (editingNodeId === node.id) {
                                return (
                                    <div key={node.id} className="flex items-center gap-1">
                                        <Input
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleEditSubmit(node.id)
                                                if (e.key === 'Escape') { setEditingNodeId(null); setEditValue("") }
                                            }}
                                            className="h-7 text-xs w-32 bg-slate-800 border-slate-700 focus-visible:ring-cyan-500 rounded-full px-3"
                                            disabled={isMutating}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDelete(node.id, e)}
                                            className="h-7 w-7 rounded-full text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                            disabled={isMutating}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            }

                            return (
                                <div key={node.id} className="relative group">
                                    <Button
                                        variant={isSelected ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => handleSelect(idx, node)}
                                        className={`rounded-full border-slate-700 transition-all text-xs h-6 px-2.5 ${
                                            isSelected
                                            ? "bg-slate-700 text-cyan-400 border-cyan-600/50"
                                            : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                                        }`}
                                    >
                                        {node.name}
                                    </Button>

                                    {/* Edit hover (only for user-owned nodes, or admin on any node) */}
                                    {(node.user_id !== null || isAdmin) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingNodeId(node.id)
                                                setEditValue(node.name)
                                                setAddingToLevel(null)
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 shadow-xl"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {addingToLevel === idx ? (
                            <div className="flex items-center gap-1">
                                <Input
                                    autoFocus
                                    value={addValue}
                                    onChange={e => setAddValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSubmit(idx, layer.parentId)
                                        if (e.key === 'Escape') { setAddingToLevel(null); setAddValue("") }
                                    }}
                                    className="h-7 text-xs w-32 bg-slate-800 border-slate-700 placeholder:text-slate-600 focus-visible:ring-cyan-500 rounded-full px-3"
                                    placeholder="New option..."
                                    disabled={isMutating}
                                />
                                {isMutating && <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />}
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setAddingToLevel(idx)
                                    setAddingParentId(layer.parentId)
                                    setAddValue("")
                                }}
                                className="h-7 w-7 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-dashed border-slate-700"
                                title="Add Option"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* Inline suggestions editor */}
            {isEditingSuggestions && (
                <div className="border-t border-slate-800/50 pt-2.5 space-y-3">
                    {/* Keywords section */}
                    <div>
                        <h4 className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Keywords</h4>
                        <div className="space-y-1">
                            {editKeywords.map(s => (
                                <div key={s.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className={`text-xs flex-1 ${pendingDismissals.has(s.id) ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                                        {s.text}
                                    </span>
                                    {s.user_id === null ? (
                                        <button
                                            onClick={() => toggleDismissal(s.id)}
                                            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                                            title={pendingDismissals.has(s.id) ? "Restore" : "Hide"}
                                        >
                                            {pendingDismissals.has(s.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setPendingDeletes(prev => new Set(prev).add(s.id))}
                                            className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                            title="Delete"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pendingNewKeywords.map((text, i) => (
                                <div key={`new-kw-${i}`} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className="text-xs flex-1 text-emerald-400">{text}</span>
                                    <button
                                        onClick={() => setPendingNewKeywords(prev => prev.filter((_, j) => j !== i))}
                                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1 mt-1.5">
                            <Input
                                value={newKeyword}
                                onChange={e => setNewKeyword(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addNewSuggestion('keyword') }}
                                placeholder="Add keyword..."
                                className="h-7 text-xs bg-slate-800 border-slate-700 placeholder:text-slate-600 focus-visible:ring-cyan-500"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addNewSuggestion('keyword')}
                                className="h-7 text-xs shrink-0 border-slate-700 text-slate-300 hover:text-white"
                            >
                                Add
                            </Button>
                        </div>
                    </div>

                    {/* Sentences section */}
                    <div>
                        <h4 className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Sentences</h4>
                        <div className="space-y-1">
                            {editSentences.map(s => (
                                <div key={s.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className={`text-xs flex-1 ${pendingDismissals.has(s.id) ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                                        {s.text}
                                    </span>
                                    {s.user_id === null ? (
                                        <button
                                            onClick={() => toggleDismissal(s.id)}
                                            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                                            title={pendingDismissals.has(s.id) ? "Restore" : "Hide"}
                                        >
                                            {pendingDismissals.has(s.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setPendingDeletes(prev => new Set(prev).add(s.id))}
                                            className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                            title="Delete"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pendingNewSentences.map((text, i) => (
                                <div key={`new-sent-${i}`} className="flex items-center justify-between gap-2 py-0.5">
                                    <span className="text-xs flex-1 text-emerald-400">{text}</span>
                                    <button
                                        onClick={() => setPendingNewSentences(prev => prev.filter((_, j) => j !== i))}
                                        className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1 mt-1.5">
                            <Input
                                value={newSentence}
                                onChange={e => setNewSentence(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addNewSuggestion('sentence') }}
                                placeholder="Add sentence..."
                                className="h-7 text-xs bg-slate-800 border-slate-700 placeholder:text-slate-600 focus-visible:ring-cyan-500"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addNewSuggestion('sentence')}
                                className="h-7 text-xs shrink-0 border-slate-700 text-slate-300 hover:text-white"
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeContextPath.length > 0 && !isEditingSuggestions && (
                <div className="mt-1.5 pt-2 border-t border-slate-800/50 flex gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Current Context:</span>
                    {activeContextPath.map(n => n.name).join(' → ')}
                </div>
            )}
        </div>
    )
}
