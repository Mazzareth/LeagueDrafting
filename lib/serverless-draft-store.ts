import type { DraftInstance } from "@/types/draft"

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory store for draft instances
interface DraftStore {
  [key: string]: {
    data: DraftInstance
    expiresAt: number
  }
}

// Global in-memory store
const draftStore: DraftStore = {}

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft:${id.toUpperCase()}`

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  const now = Date.now()
  Object.keys(draftStore).forEach(key => {
    if (draftStore[key].expiresAt <= now) {
      console.log(`[ServerlessStore] cleanupExpiredDrafts: Removing expired draft "${key}"`)
      delete draftStore[key]
    }
  })
}

// Run cleanup every minute if we're in a non-serverless environment
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 60 * 1000)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[ServerlessStore] getDraft: Attempting to get draft with key "${key}"`)
  try {
    const draft = draftStore[key]
    if (draft && draft.expiresAt > Date.now()) {
      console.log(`[ServerlessStore] getDraft: Found draft for key "${key}".`)
      return draft.data
    } else {
      if (draft) {
        // Clean up expired draft
        delete draftStore[key]
      }
      console.warn(`[ServerlessStore] getDraft: Draft NOT FOUND for key "${key}".`)
      return null
    }
  } catch (error) {
    console.error(`[ServerlessStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  console.log(`[ServerlessStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  try {
    draftStore[key] = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    console.log(`[ServerlessStore] saveDraft: Successfully saved draft with key "${key}".`)
  } catch (error) {
    console.error(`[ServerlessStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[ServerlessStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}