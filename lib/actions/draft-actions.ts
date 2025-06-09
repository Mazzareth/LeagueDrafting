"use server"

import { fetchChampions } from "@/lib/fetch-champions"
// Import from the hybrid store implementation for maximum reliability
import { getDraft, saveDraft, generateDraftId } from "@/lib/hybrid-draft-store"
import type { DraftInstance, DraftActionResponse, PlayerRole } from "@/types/draft"
import { DRAFT_ORDER } from "@/types/draft"
import type { Champion } from "@/lib/fetch-champions"

export async function createDraftInstanceAction(playerId: string): Promise<DraftActionResponse> {
  console.log(`[Action] createDraftInstanceAction: Called by player "${playerId}"`)
  try {
    const allChampions = await fetchChampions()
    const draftId = generateDraftId() // Logs itself
    const newDraft: DraftInstance = {
      id: draftId,
      hostPlayerId: playerId,
      blueTeam: {
        player: { id: playerId, name: "Blue Player", isReady: false },
        bans: [],
        picks: [],
      },
      redTeam: {
        bans: [],
        picks: [],
      },
      currentPhaseIndex: -2, // Waiting for Red player
      availableChampions: [...allChampions],
      allChampions: [...allChampions],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveDraft(newDraft) // Logs itself
    console.log(`[Action] createDraftInstanceAction: Successfully created draft "${draftId}" for player "${playerId}".`)
    return { success: true, draftId: newDraft.id, draftInstance: newDraft }
  } catch (error) {
    console.error("[Action] createDraftInstanceAction: Error creating draft:", error)
    return { success: false, message: "Failed to create draft instance." }
  }
}

export async function joinDraftInstanceAction(draftIdInput: string, playerId: string): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase() // Ensure ID is uppercase for lookup
  console.log(`[Action] joinDraftInstanceAction: Called for draft "${draftId}" by player "${playerId}"`)
  const draft = await getDraft(draftId) // Logs itself
  if (!draft) {
    console.warn(
      `[Action] joinDraftInstanceAction: Draft "${draftId}" not found when player "${playerId}" tried to join.`,
    )
    return { success: false, message: "Draft instance not found. It may have expired or the code is incorrect." }
  }

  if (draft.redTeam.player) {
    if (draft.redTeam.player.id === playerId) {
      console.log(`[Action] joinDraftInstanceAction: Player "${playerId}" rejoining draft "${draftId}" as Red Team.`)
      return { success: true, draftInstance: draft, message: "Rejoined draft." }
    }
    console.warn(`[Action] joinDraftInstanceAction: Draft "${draftId}" is full. Player "${playerId}" cannot join.`)
    return { success: false, message: "Draft instance is full." }
  }
  if (draft.blueTeam.player?.id === playerId) {
    console.log(
      `[Action] joinDraftInstanceAction: Player "${playerId}" is host of draft "${draftId}", cannot join as Red.`,
    )
    // This is fine, they are already in.
    return { success: true, draftInstance: draft, message: "You are the host (Blue Team)." }
  }

  draft.redTeam.player = { id: playerId, name: "Red Player", isReady: false }
  draft.currentPhaseIndex = -1 // Move to Ready Check
  await saveDraft(draft)
  console.log(
    `[Action] joinDraftInstanceAction: Player "${playerId}" successfully joined draft "${draftId}" as Red Team.`,
  )
  return { success: true, draftInstance: draft }
}

export async function setPlayerReadyAction(
  draftIdInput: string,
  playerId: string,
  isReady: boolean,
): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] setPlayerReadyAction: Draft "${draftId}", Player "${playerId}", Ready: ${isReady}`)
  const draft = await getDraft(draftId)
  if (!draft) return { success: false, message: "Draft not found." }

  let playerRole: PlayerRole | null = null
  if (draft.blueTeam.player?.id === playerId) {
    draft.blueTeam.player.isReady = isReady
    playerRole = "blue"
  } else if (draft.redTeam.player?.id === playerId) {
    draft.redTeam.player.isReady = isReady
    playerRole = "red"
  } else {
    return { success: false, message: "Player not found in draft." }
  }

  // Check if both players are ready
  if (draft.blueTeam.player?.isReady && draft.redTeam.player?.isReady && draft.currentPhaseIndex === -1) {
    draft.currentPhaseIndex = 0 // Start drafting (Blue Ban 1)
  } else if (!isReady && draft.currentPhaseIndex >= 0) {
    // If a player un-readies during draft, pause it (optional behavior)
    // draft.currentPhaseIndex = -1; // Back to ready check
  }

  await saveDraft(draft)
  return { success: true, draftInstance: draft }
}

export async function makeSelectionAction(
  draftIdInput: string,
  playerId: string,
  champion: Champion,
): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] makeSelectionAction: Draft "${draftId}", Player "${playerId}", Champion: ${champion.name}`)
  const draft = await getDraft(draftId)
  if (!draft) return { success: false, message: "Draft not found." }

  const currentAction = DRAFT_ORDER[draft.currentPhaseIndex]
  const playerTeam =
    draft.blueTeam.player?.id === playerId
      ? draft.blueTeam
      : draft.redTeam.player?.id === playerId
        ? draft.redTeam
        : null
  const playerRole =
    draft.blueTeam.player?.id === playerId ? "blue" : draft.redTeam.player?.id === playerId ? "red" : null

  if (!playerTeam || playerRole !== currentAction.team) {
    return { success: false, message: "Not your turn or player not identified." }
  }

  // Check if champion is already picked or banned
  const isAlreadySelected = ![
    ...draft.blueTeam.bans,
    ...draft.redTeam.bans,
    ...draft.blueTeam.picks,
    ...draft.redTeam.picks,
  ].every((c) => c.id !== champion.id)
  if (isAlreadySelected) {
    return { success: false, message: "Champion already selected." }
  }

  if (currentAction.type === "ban") {
    if (playerRole === "blue") draft.blueTeam.bans.push(champion)
    else draft.redTeam.bans.push(champion)
  } else {
    // pick
    if (playerRole === "blue") draft.blueTeam.picks.push(champion)
    else draft.redTeam.picks.push(champion)
  }

  draft.availableChampions = draft.availableChampions.filter((c) => c.id !== champion.id)
  draft.currentPhaseIndex++

  await saveDraft(draft)
  return { success: true, draftInstance: draft }
}

export async function getDraftStateAction(draftIdInput: string): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] getDraftStateAction: Called for draft "${draftId}"`)
  const draft = await getDraft(draftId) // Logs itself
  if (!draft) {
    console.warn(`[Action] getDraftStateAction: Draft "${draftId}" not found.`)
    return { success: false, message: "Draft not found." }
  }
  console.log(`[Action] getDraftStateAction: Successfully retrieved draft "${draftId}".`)
  return { success: true, draftInstance: draft }
}
