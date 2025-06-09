"use server"

import type { DraftActionResponse, PlayerRole } from "@/types/draft"
import type { Champion } from "@/lib/fetch-champions"
import { DRAFT_ORDER } from "@/types/draft"

// Helper function to make API requests
async function fetchFromAPI(endpoint: string, method: string, body?: any): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  const url = `${baseUrl}${endpoint}`
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Disable caching
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  const response = await fetch(url, options)
  return await response.json()
}

export async function createDraftInstanceAction(playerId: string): Promise<DraftActionResponse> {
  console.log(`[Action] createDraftInstanceAction: Called by player "${playerId}"`)
  try {
    const response = await fetchFromAPI('/api/drafts', 'POST', { playerId })
    
    if (response.success) {
      console.log(`[Action] createDraftInstanceAction: Successfully created draft "${response.draftId}" for player "${playerId}".`)
      return { 
        success: true, 
        draftId: response.draftId, 
        draftInstance: response.draftInstance 
      }
    } else {
      console.error("[Action] createDraftInstanceAction: API returned error:", response.message)
      return { success: false, message: response.message || "Failed to create draft instance." }
    }
  } catch (error) {
    console.error("[Action] createDraftInstanceAction: Error creating draft:", error)
    return { success: false, message: "Failed to create draft instance." }
  }
}

export async function joinDraftInstanceAction(draftIdInput: string, playerId: string): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase() // Ensure ID is uppercase for lookup
  console.log(`[Action] joinDraftInstanceAction: Called for draft "${draftId}" by player "${playerId}"`)
  
  try {
    const response = await fetchFromAPI('/api/drafts', 'PATCH', {
      draftId,
      playerId,
      action: 'join'
    })
    
    if (response.success) {
      console.log(`[Action] joinDraftInstanceAction: Player "${playerId}" successfully joined draft "${draftId}".`)
      return { 
        success: true, 
        draftInstance: response.draftInstance,
        message: response.message
      }
    } else {
      console.warn(`[Action] joinDraftInstanceAction: API returned error:`, response.message)
      return { success: false, message: response.message || "Failed to join draft." }
    }
  } catch (error) {
    console.error(`[Action] joinDraftInstanceAction: Error joining draft "${draftId}":`, error)
    return { success: false, message: "Failed to join draft. Please try again." }
  }
}

export async function setPlayerReadyAction(
  draftIdInput: string,
  playerId: string,
  isReady: boolean,
): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] setPlayerReadyAction: Draft "${draftId}", Player "${playerId}", Ready: ${isReady}`)
  
  try {
    const response = await fetchFromAPI('/api/drafts', 'PATCH', {
      draftId,
      playerId,
      action: 'ready',
      data: { isReady }
    })
    
    if (response.success) {
      return { success: true, draftInstance: response.draftInstance }
    } else {
      return { success: false, message: response.message || "Failed to update ready status." }
    }
  } catch (error) {
    console.error(`[Action] setPlayerReadyAction: Error updating ready status:`, error)
    return { success: false, message: "Failed to update ready status. Please try again." }
  }
}

export async function makeSelectionAction(
  draftIdInput: string,
  playerId: string,
  champion: Champion,
): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] makeSelectionAction: Draft "${draftId}", Player "${playerId}", Champion: ${champion.name}`)
  
  try {
    const response = await fetchFromAPI('/api/drafts', 'PATCH', {
      draftId,
      playerId,
      action: 'selection',
      data: { champion }
    })
    
    if (response.success) {
      return { success: true, draftInstance: response.draftInstance }
    } else {
      return { success: false, message: response.message || "Failed to make selection." }
    }
  } catch (error) {
    console.error(`[Action] makeSelectionAction: Error making selection:`, error)
    return { success: false, message: "Failed to make selection. Please try again." }
  }
}

export async function getDraftStateAction(draftIdInput: string): Promise<DraftActionResponse> {
  const draftId = draftIdInput.toUpperCase()
  console.log(`[Action] getDraftStateAction: Called for draft "${draftId}"`)
  
  try {
    const response = await fetchFromAPI(`/api/drafts?id=${draftId}`, 'GET')
    
    if (response.success) {
      console.log(`[Action] getDraftStateAction: Successfully retrieved draft "${draftId}".`)
      return { success: true, draftInstance: response.draftInstance }
    } else {
      console.warn(`[Action] getDraftStateAction: API returned error:`, response.message)
      return { success: false, message: response.message || "Failed to retrieve draft." }
    }
  } catch (error) {
    console.error(`[Action] getDraftStateAction: Error retrieving draft "${draftId}":`, error)
    return { success: false, message: "Failed to retrieve draft. Please try again." }
  }
}