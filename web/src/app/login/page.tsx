'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAction = async (formData: FormData, actionFunc: typeof login) => {
    setLoading(true)
    setError(null)
    const result = await actionFunc(formData)
    if (result?.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Speakerly</h1>
          <p className="text-slate-400">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="p-3 text-sm rounded bg-red-500/10 border border-red-500/50 text-red-400">
            {error}
          </div>
        )}

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              className="bg-slate-900 border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-slate-900 border-slate-800"
            />
          </div>
          
          <div className="flex gap-4 pt-2">
            <Button
              formAction={(data) => handleAction(data, login)}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              disabled={loading}
            >
              Sign In
            </Button>
            <Button
              formAction={(data) => handleAction(data, signup)}
              variant="outline"
              className="flex-1 border-slate-700 bg-slate-900 hover:bg-slate-800 hover:text-white"
              disabled={loading}
            >
              Sign Up
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
