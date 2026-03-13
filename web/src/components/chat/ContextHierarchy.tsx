'use client'

import React, { useState, useEffect } from "react"
import { ChevronRight, Loader2, Save, X, Edit, Plus, RefreshCw } from "lucide-react"
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
}

interface ContextHierarchyProps {
    activeContextPath: ContextNode[];
    setActiveContextPath: (path: ContextNode[]) => void;
    onSuggestionsChange?: (suggestions: ContextSuggestion[]) => void;
}

export function ContextHierarchy({ activeContextPath, setActiveContextPath, onSuggestionsChange }: ContextHierarchyProps) {
    const [tree, setTree] = useState<ContextNode[]>([])
    const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDefaultView, setIsDefaultView] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Editing states (not fully implemented in this ticket but scaffolding remains)
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")
    
    // Adding states
    const [addingToLevel, setAddingToLevel] = useState<number | null>(null)
    const [addingParentId, setAddingParentId] = useState<string | null>(null)
    const [addValue, setAddValue] = useState("")
    const [isMutating, setIsMutating] = useState(false)

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
            setIsDefaultView(data.isUsingDefaults)

            // Re-map active path to the refreshed tree nodes so selection persists
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
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (onSuggestionsChange) {
            if (activeContextPath.length > 0) {
                const currentId = activeContextPath[activeContextPath.length - 1].id;
                const activeSuggestions = suggestions.filter(s => s.context_id === currentId);
                onSuggestionsChange(activeSuggestions);
            } else {
                onSuggestionsChange([]);
            }
        }
    }, [activeContextPath, suggestions]);

    const copyDefaults = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/contexts', { method: 'POST' })
            if (!res.ok) throw new Error("Failed to reset to defaults")
            await fetchData()
            setActiveContextPath([]) // Reset selection
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSelect = (level: number, node: ContextNode) => {
        // Close any open add/edit inputs on navigation
        if (addingToLevel !== null) setAddingToLevel(null)
        
        const newPath = activeContextPath.slice(0, level)
        setActiveContextPath([...newPath, node])
    }

    const handleAddSubmit = async (level: number, parentId: string | null) => {
        if (!addValue.trim()) {
            setAddingToLevel(null)
            return
        }
        
        setIsMutating(true)
        setError(null)
        try {
            const res = await fetch('/api/contexts/node', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: parentId, name: addValue.trim() })
            })
            
            if (!res.ok) throw new Error("Failed to create option")
            
            // Reload tree to get the true structure and UUIDs
            await fetchData()
            setAddValue("")
            setAddingToLevel(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsMutating(false)
        }
    }

    const handleEditSubmit = async (id: string) => {
        if (!editValue.trim()) {
            setEditingNodeId(null)
            return
        }
        
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
        } catch (err: any) {
            setError(err.message)
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
            const res = await fetch(`/api/contexts/node?id=${id}`, {
                method: 'DELETE'
            })
            
            if (!res.ok) throw new Error("Failed to delete option")
            
            // If the deleted node was in our active path, we need to pop it and its children off
            if (activeContextPath.some(n => n.id === id)) {
                const idx = activeContextPath.findIndex(n => n.id === id)
                setActiveContextPath(activeContextPath.slice(0, idx))
            }

            await fetchData()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsMutating(false)
        }
    }

    // Temporary local mutation to let the user add/edit before saving to DB
    // In a full implementation, we'd hit PUT/POST endpoints for individual nodes immediately.
    // For now, we will only show UI for it.

    // Calculate layers to display based on active path
    const layersToDisplay: { nodes: ContextNode[], level: number, parentId: string | null }[] = [
        { nodes: tree, level: 0, parentId: null }
    ]

    activeContextPath.forEach((node, index) => {
        if (node.children && node.children.length > 0) {
            layersToDisplay.push({ nodes: node.children, level: index + 1, parentId: node.id })
        } else {
             // Empty layer to allow adding children
             layersToDisplay.push({ nodes: [], level: index + 1, parentId: node.id })
        }
    })

    if (isLoading) {
        return <div className="flex justify-center p-4 text-slate-500"><Loader2 className="animate-spin h-5 w-5" /></div>
    }

    return (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-2.5 space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-800/50">
                <h3 className="text-xs font-semibold text-slate-300">Situational Context</h3>
                {isDefaultView ? (
                    <Button variant="outline" size="sm" onClick={copyDefaults} disabled={isSaving} className="h-7 text-xs border-cyan-800/50 hover:bg-cyan-900/20 text-cyan-400">
                        <Edit className="h-3 w-3 mr-1" /> Override Defaults
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" onClick={copyDefaults} disabled={isSaving} className="h-7 text-xs text-slate-500 hover:text-red-400">
                        <RefreshCw className="h-3 w-3 mr-1" /> Reset to Defaults
                    </Button>
                )}
            </div>

            {error && <div className="text-red-400 text-xs">{error}</div>}

            <div className="space-y-1.5">
                {layersToDisplay.map((layer, idx) => (
                    <div key={`layer-${idx}`} className="flex flex-wrap items-center gap-1.5">
                        {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />}
                        
                        {layer.nodes.map(node => {
                            const isSelected = activeContextPath[idx]?.id === node.id
                            
                            if (editingNodeId === node.id && !isDefaultView) {
                                return (
                                    <div key={node.id} className="flex items-center gap-1">
                                        <Input 
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleEditSubmit(node.id)
                                                if (e.key === 'Escape') {
                                                    setEditingNodeId(null)
                                                    setEditValue("")
                                                }
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
                                    
                                    {/* Edit Hover Action */}
                                    {!isDefaultView && (
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
                                        if (e.key === 'Escape') {
                                            setAddingToLevel(null)
                                            setAddValue("")
                                        }
                                    }}
                                    className="h-7 text-xs w-32 bg-slate-800 border-slate-700 placeholder:text-slate-600 focus-visible:ring-cyan-500 rounded-full px-3"
                                    placeholder="New option..."
                                    disabled={isMutating}
                                />
                                {isMutating && <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />}
                            </div>
                        ) : (
                            !isDefaultView && (
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
                            )
                        )}
                    </div>
                ))}
            </div>

            {activeContextPath.length > 0 && (
                <div className="mt-1.5 pt-2 border-t border-slate-800/50 flex gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Current Context:</span>
                    {activeContextPath.map(n => n.name).join(' → ')}
                </div>
            )}
        </div>
    )
}
