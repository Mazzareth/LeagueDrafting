"use client" // Make this a client component for form handling and localStorage

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createDraftInstanceAction, joinDraftInstanceAction } from "@/lib/actions/new-draft-actions"
import { Loader2, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { storeDraftInLocalStorage } from "@/lib/client-draft-storage"

// Helper to get or set a player ID in localStorage
function getOrSetPlayerId(): string {
  let playerId = localStorage.getItem("lol_drafter_player_id")
  if (!playerId) {
    playerId = Math.random().toString(36).substring(2, 15)
    localStorage.setItem("lol_drafter_player_id", playerId)
  }
  return playerId
}

export default function HomePage() {
  const [joinCode, setJoinCode] = useState("")
  const [isLoadingCreate, setIsLoadingCreate] = useState(false)
  const [isLoadingJoin, setIsLoadingJoin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    setPlayerId(getOrSetPlayerId())
  }, [])

  const handleCreateDraft = async () => {
    if (!playerId) {
      setError("Player ID not initialized. Please refresh.")
      return
    }
    setIsLoadingCreate(true)
    setError(null)
    const response = await createDraftInstanceAction(playerId)
    if (response.success && response.draftId && response.draftInstance) {
      // Store the draft in localStorage before navigating
      storeDraftInLocalStorage(response.draftInstance)
      router.push(`/draft/${response.draftId}`)
    } else {
      setError(response.message || "Failed to create draft.")
    }
    setIsLoadingCreate(false)
  }

  const handleJoinDraft = async () => {
    if (!playerId) {
      setError("Player ID not initialized. Please refresh.")
      return
    }
    if (!joinCode.trim()) {
      setError("Please enter a draft code to join.")
      return
    }
    setIsLoadingJoin(true)
    setError(null)
    // Attempt to join. The server action will add the player if slot is available.
    // The draft page itself will handle fetching the state.
    // We can also use joinDraftInstanceAction here for immediate feedback, but redirecting is simpler.
    const draftId = joinCode.trim().toUpperCase()
    const joinResponse = await joinDraftInstanceAction(draftId, playerId)

    if (joinResponse.success && joinResponse.draftInstance) {
      // Store the draft in localStorage before navigating
      storeDraftInLocalStorage(joinResponse.draftInstance)
      router.push(`/draft/${draftId}`)
    } else {
      setError(joinResponse.message || "Failed to join draft. Code might be invalid or room full.")
    }
    setIsLoadingJoin(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">LoL Draft Tool</h1>
          <p className="mt-2 text-muted-foreground">Create a new draft room or join an existing one.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create New Draft</CardTitle>
            <CardDescription>Start a new draft room as Blue Team.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleCreateDraft} disabled={isLoadingCreate || !playerId} className="w-full">
              {isLoadingCreate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Draft
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Existing Draft</CardTitle>
            <CardDescription>Enter the code to join a draft room as Red Team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Enter Draft Code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center font-mono"
              maxLength={6}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleJoinDraft} disabled={isLoadingJoin || !playerId} className="w-full">
              {isLoadingJoin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Draft
            </Button>
          </CardFooter>
        </Card>
        <p className="text-xs text-center text-muted-foreground">Your Player ID: {playerId || "Initializing..."}</p>
      </div>
    </div>
  )
}
