import { cookies } from "next/headers"
import { getDraftStateAction, joinDraftInstanceAction } from "@/lib/actions/draft-actions"
import DraftRoomClient from "@/components/draft-room-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Helper to get a player ID from cookies for server-side logic (like auto-join)
// Client-side will primarily use localStorage.
function getServerPlayerId(): string | undefined {
  const cookieStore = cookies()
  // This ID is mainly for the server to know *if* a user might be returning.
  // The client component will establish its own definitive ID from localStorage.
  return cookieStore.get("lol_drafter_player_id")?.value
}

export default async function DraftRoomPage({ params }: { params: { draftId: string } }) {
  const draftId = params.draftId.toUpperCase() // Ensure ID is uppercase
  const serverSidePlayerId = getServerPlayerId() // This is for the server's context

  console.log(
    `[DraftPage] Loading page for draft "${draftId}". Server-side player ID (from cookie, if any): "${serverSidePlayerId}"`,
  )

  let initialDraftResponse = await getDraftStateAction(draftId)

  // Auto-join logic:
  // - Draft must exist and be successfully fetched.
  // - The draft instance itself must be defined.
  // - Both blueTeam and redTeam objects must be defined on the draft instance.
  // - Red team slot must be empty (no player).
  // - A serverSidePlayerId must be available (user has a cookie).
  // - The current user (serverSidePlayerId) must not already be the blue team player.
  if (
    initialDraftResponse.success &&
    initialDraftResponse.draftInstance &&
    initialDraftResponse.draftInstance.blueTeam && // Defensive check
    initialDraftResponse.draftInstance.redTeam && // Defensive check
    !initialDraftResponse.draftInstance.redTeam.player &&
    serverSidePlayerId &&
    initialDraftResponse.draftInstance.blueTeam.player?.id !== serverSidePlayerId
  ) {
    console.log(
      `[DraftPage] Attempting auto-join for player "${serverSidePlayerId}" into draft "${draftId}" as Red Team.`,
    )
    const joinResponse = await joinDraftInstanceAction(draftId, serverSidePlayerId)
    if (joinResponse.success && joinResponse.draftInstance) {
      console.log(`[DraftPage] Auto-join successful for player "${serverSidePlayerId}".`)
      initialDraftResponse = joinResponse // Use the state after joining
    } else {
      console.warn(`[DraftPage] Auto-join failed for player "${serverSidePlayerId}": ${joinResponse.message}`)
    }
  }

  if (!initialDraftResponse.success || !initialDraftResponse.draftInstance) {
    console.warn(
      `[DraftPage] Final check: Draft "${draftId}" not found or failed to load. Message: ${initialDraftResponse.message}`,
    )
    return (
      <div className="container mx-auto p-8 text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Draft Not Found</AlertTitle>
          <AlertDescription>
            The draft instance with ID "{draftId}" could not be found. It might have expired, the code could be
            incorrect, or the server may have restarted if this is a development environment.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-6">
          <Link href="/">Create or Join a New Draft</Link>
        </Button>
      </div>
    )
  }

  console.log(`[DraftPage] Successfully loaded initial state for draft "${draftId}". Passing to client component.`)
  // The initialPlayerId prop is removed from DraftRoomClient, as it now manages its own ID via localStorage.
  return <DraftRoomClient initialDraftInstance={initialDraftResponse.draftInstance} />
}
