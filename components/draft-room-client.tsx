"use client"

import { useState, useEffect, useCallback } from "react"
// useRouter can be removed if not used for navigation within this component
// import { useRouter } from "next/navigation"
import type { DraftInstance, PlayerRole, Champion } from "@/types/draft"
import { DRAFT_ORDER } from "@/types/draft"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Copy, Check, ShieldAlert, Swords, CheckCircle } from "lucide-react"
import ChampionSelector from "./champion-selector"
import { setPlayerReadyAction, makeSelectionAction, getDraftStateAction } from "@/lib/actions/new-draft-actions"
import { Input } from "@/components/ui/input"

interface DraftRoomClientProps {
  initialDraftInstance: DraftInstance
  // initialPlayerId prop is removed as client will establish its own from localStorage
}

// Helper to get or set a player ID in localStorage, ensuring it's always available client-side
function getOrSetClientPlayerId(): string {
  let pid = localStorage.getItem("lol_drafter_player_id")
  if (!pid) {
    pid = Math.random().toString(36).substring(2, 15)
    localStorage.setItem("lol_drafter_player_id", pid)
    console.log(`[DraftRoomClient] New client Player ID generated and stored: ${pid}`)
  }
  return pid
}

function TeamDisplay({
  teamName,
  team,
  role,
}: { teamName: string; team: DraftInstance["blueTeam"] | DraftInstance["redTeam"]; role: PlayerRole }) {
  const DDRAGON_VERSION = "14.11.1" // Should be from a shared config or fetchChampions
  const getChampionImageUrl = (imageFullName: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${imageFullName}`

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className={role === "blue" ? "text-blue-500" : "text-red-500"}>{teamName}</CardTitle>
        <CardDescription>
          {team.player
            ? `${team.player.name} ${team.player.isReady ? "(Ready)" : "(Not Ready)"}`
            : "Waiting for player..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <h4 className="font-semibold mb-1 text-sm">Bans: ({team.bans.length}/3)</h4>
          <div className="flex space-x-1 mb-2 min-h-[44px]">
            {team.bans.map((c) => (
              <img
                key={`ban-${role}-${c.id}`}
                src={getChampionImageUrl(c.image.full) || "/placeholder.svg"}
                alt={c.name}
                title={c.name}
                className="w-10 h-10 rounded border-2 border-destructive object-cover"
              />
            ))}
            {Array(3 - team.bans.length)
              .fill(0)
              .map((_, i) => (
                <div
                  key={`ban-placeholder-${role}-${i}`}
                  className="w-10 h-10 rounded bg-muted/50 border border-dashed"
                />
              ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-1 text-sm">Picks: ({team.picks.length}/5)</h4>
          <div className="flex space-x-1 min-h-[44px]">
            {team.picks.map((c) => (
              <img
                key={`pick-${role}-${c.id}`}
                src={getChampionImageUrl(c.image.full) || "/placeholder.svg"}
                alt={c.name}
                title={c.name}
                className="w-10 h-10 rounded border-2 border-primary object-cover"
              />
            ))}
            {Array(5 - team.picks.length)
              .fill(0)
              .map((_, i) => (
                <div
                  key={`pick-placeholder-${role}-${i}`}
                  className="w-10 h-10 rounded bg-muted/50 border border-dashed"
                />
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DraftRoomClient({ initialDraftInstance }: DraftRoomClientProps) {
  const [draft, setDraft] = useState<DraftInstance>(initialDraftInstance)
  const [clientPlayerId, setClientPlayerId] = useState<string>("") // Player ID from localStorage
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // const router = useRouter(); // Can be removed if not used

  useEffect(() => {
    // Establish clientPlayerId from localStorage on component mount
    const pid = getOrSetClientPlayerId()
    setClientPlayerId(pid)
    console.log(`[DraftRoomClient] Effective Player ID for this client: ${pid}`)
  }, [])

  const playerRole: PlayerRole | null =
    draft.blueTeam.player?.id === clientPlayerId ? "blue" : draft.redTeam.player?.id === clientPlayerId ? "red" : null

  const refreshDraftState = useCallback(async () => {
    if (!draft.id) return
    // console.log(`[DraftRoomClient] Refreshing draft state for ${draft.id}`);
    const response = await getDraftStateAction(draft.id)
    if (response.success && response.draftInstance) {
      setDraft(response.draftInstance)
    } else {
      // Avoid setting error if draft just ended or something minor.
      // Only set error if it's a persistent issue.
      console.warn(`[DraftRoomClient] Failed to refresh draft state: ${response.message}`)
      // setError(response.message || "Failed to refresh draft state.");
    }
  }, [draft.id])

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshDraftState()
    }, 5000) // Poll every 5 seconds
    return () => clearInterval(intervalId)
  }, [refreshDraftState])

  const handleReadyClick = async () => {
    if (!playerRole || !clientPlayerId) {
      console.error("[DraftRoomClient] handleReadyClick: No player role or clientPlayerId.")
      return
    }
    setIsLoading(true)
    setError(null)
    const currentTeam = playerRole === "blue" ? draft.blueTeam : draft.redTeam
    const response = await setPlayerReadyAction(draft.id, clientPlayerId, !currentTeam.player?.isReady)
    if (response.success && response.draftInstance) {
      setDraft(response.draftInstance)
    } else {
      setError(response.message || "Failed to update ready status.")
    }
    setIsLoading(false)
  }

  const handleSelectChampion = async (champion: Champion) => {
    if (!playerRole || !clientPlayerId) {
      console.error("[DraftRoomClient] handleSelectChampion: No player role or clientPlayerId.")
      return
    }
    setIsLoading(true)
    setError(null)
    const response = await makeSelectionAction(draft.id, clientPlayerId, champion)
    if (response.success && response.draftInstance) {
      setDraft(response.draftInstance)
    } else {
      setError(response.message || "Failed to make selection.")
    }
    setIsLoading(false)
  }

  const copyDraftLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/draft/${draft.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentAction =
    draft.currentPhaseIndex >= 0 && draft.currentPhaseIndex < DRAFT_ORDER.length
      ? DRAFT_ORDER[draft.currentPhaseIndex]
      : null

  const isMyTurn = clientPlayerId && playerRole && currentAction && currentAction.team === playerRole

  let statusMessage = "Waiting for players..."
  if (draft.currentPhaseIndex === -2 && draft.blueTeam.player) {
    statusMessage = "Waiting for Red Team to join. Share the code!"
  } else if (draft.currentPhaseIndex === -1) {
    statusMessage = "Ready Check Phase. Click 'Ready Up' to begin."
  } else if (currentAction) {
    statusMessage = `${currentAction.displayText}. ${isMyTurn ? "Your turn!" : `Waiting for ${currentAction.team === "blue" ? "Blue" : "Red"} Team.`}`
  } else if (draft.currentPhaseIndex >= DRAFT_ORDER.length) {
    statusMessage = "Draft Complete!"
  }

  const availableForSelection = draft.availableChampions.filter(
    (champ) =>
      !draft.blueTeam.bans.find((b) => b.id === champ.id) &&
      !draft.redTeam.bans.find((b) => b.id === champ.id) &&
      (currentAction?.type === "pick"
        ? !draft.blueTeam.picks.find((p) => p.id === champ.id) && !draft.redTeam.picks.find((p) => p.id === champ.id)
        : true),
  )

  if (!clientPlayerId) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Initializing player...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <Card>
        <CardHeader>
          <CardTitle>Draft Room: {draft.id}</CardTitle>
          <CardDescription>
            Share this code with the other player to join. Your Player ID: {clientPlayerId}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center space-x-2">
          <Input type="text" value={draft.id} readOnly className="font-mono bg-muted px-2 py-1 rounded" />
          <Button onClick={copyDraftLink} variant="outline" size="icon" aria-label="Copy draft code">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert className="bg-primary/10 border-primary/30">
        <Swords className="h-4 w-4 text-primary" />
        <AlertTitle className="font-semibold text-primary">Current Status</AlertTitle>
        <AlertDescription>{statusMessage}</AlertDescription>
      </Alert>

      <div className="flex flex-col md:flex-row gap-4">
        <TeamDisplay teamName="Blue Team" team={draft.blueTeam} role="blue" />
        <TeamDisplay teamName="Red Team" team={draft.redTeam} role="red" />
      </div>

      {playerRole && draft.currentPhaseIndex === -1 && (
        <div className="text-center">
          <Button onClick={handleReadyClick} size="lg" disabled={isLoading} className="w-full md:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(playerRole === "blue" ? draft.blueTeam.player?.isReady : draft.redTeam.player?.isReady)
              ? "Unready"
              : "Ready Up!"}
          </Button>
        </div>
      )}

      {isMyTurn && currentAction && (
        <ChampionSelector
          champions={availableForSelection}
          onSelectChampion={handleSelectChampion}
          disabled={isLoading}
          actionText={currentAction.type === "ban" ? "Ban Champion" : "Pick Champion"}
        />
      )}

      {!playerRole && draft.currentPhaseIndex === -2 && (
        <p className="text-center text-muted-foreground">
          You are viewing this draft. Join with the code if you are Red Team.
        </p>
      )}

      {!playerRole &&
        draft.currentPhaseIndex >= -1 &&
        draft.blueTeam.player?.id !== clientPlayerId &&
        draft.redTeam.player?.id !== clientPlayerId && (
          <p className="text-center text-muted-foreground">You are viewing this draft as a spectator.</p>
        )}

      {draft.currentPhaseIndex >= DRAFT_ORDER.length && (
        <Alert variant="success" className="bg-green-500/10 border-green-500/30 text-green-700">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Draft Complete!</AlertTitle>
          <AlertDescription>The draft has concluded. Review the picks and bans above.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
