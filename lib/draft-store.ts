import type { DraftInstance } from "@/types/draft"

// Time-to-live for draft instances in seconds (e.g., 2 hours)
const DRAFT_TTL_SECONDS = 2 * 60 * 60

// In-memory store for draft instances
interface DraftStore {
  [key: string]: {
    data: DraftInstance
    expiresAt: number
  }
}

const draftStore: DraftStore = {}

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  const now = Date.now()
  Object.keys(draftStore).forEach(key => {
    if (draftStore[key].expiresAt <= now) {
      console.log(`[MemoryStore] cleanupExpiredDrafts: Removing expired draft "${key}"`)
      delete draftStore[key]
    }
  })
}

// Run cleanup every minute
setInterval(cleanupExpiredDrafts, 60 * 1000)

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft:${id.toUpperCase()}`

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[MemoryStore] getDraft: Attempting to get draft with key "${key}"`)
  try {
    const draft = draftStore[key]
    if (draft && draft.expiresAt > Date.now()) {
      console.log(`[MemoryStore] getDraft: Found draft for key "${key}".`)
      return draft.data
    } else {
      if (draft) {
        // Clean up expired draft
        delete draftStore[key]
      }
      console.warn(`[MemoryStore] getDraft: Draft NOT FOUND for key "${key}".`)
      return null
    }
  } catch (error) {
    console.error(`[MemoryStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  console.log(`[MemoryStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  try {
    draftStore[key] = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    console.log(`[MemoryStore] saveDraft: Successfully saved draft with key "${key}".`)
  } catch (error) {
    console.error(`[MemoryStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[MemoryStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}
