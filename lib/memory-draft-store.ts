import type { DraftInstance } from "@/types/draft"
import { nanoid } from 'nanoid'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory storage for drafts (will be reset on server restart)
// This is a simple Map that stores drafts with their expiration time
const draftStore = new Map<string, { data: DraftInstance, expiresAt: number }>()

// Clean up expired drafts periodically
function cleanupExpiredDrafts() {
  const now = Date.now()
  for (const [key, value] of draftStore.entries()) {
    if (value.expiresAt <= now) {
      console.log(`[MemoryDraftStore] cleanupExpiredDrafts: Removing expired draft "${key}"`)
      draftStore.delete(key)
    }
  }
}

// Set up a cleanup interval (every hour)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 60 * 60 * 1000)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const draftId = id.toUpperCase()
  console.log(`[MemoryDraftStore] getDraft: Attempting to get draft "${draftId}"`)
  
  try {
    const draftData = draftStore.get(draftId)
    
    if (!draftData) {
      console.warn(`[MemoryDraftStore] getDraft: Draft not found for "${draftId}".`)
      return null
    }
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[MemoryDraftStore] getDraft: Draft "${draftId}" has expired.`)
      draftStore.delete(draftId)
      return null
    }
    
    console.log(`[MemoryDraftStore] getDraft: Successfully loaded draft "${draftId}".`)
    return draftData.data
  } catch (error) {
    console.error(`[MemoryDraftStore] getDraft: Error fetching draft "${draftId}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const draftId = draft.id.toUpperCase()
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[MemoryDraftStore] saveDraft: Saving draft "${draftId}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to memory store
    draftStore.set(draftId, draftData)
    
    console.log(`[MemoryDraftStore] saveDraft: Successfully saved draft "${draftId}".`)
  } catch (error) {
    console.error(`[MemoryDraftStore] saveDraft: Error saving draft "${draftId}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  // Generate a 6-character alphanumeric ID
  const id = nanoid(6).toUpperCase()
  console.log(`[MemoryDraftStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}