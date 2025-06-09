import { kv } from "@vercel/kv"
import type { DraftInstance } from "@/types/draft"

// Time-to-live for draft instances in seconds (e.g., 2 hours)
const DRAFT_TTL_SECONDS = 2 * 60 * 60

// Helper function to create a KV key for drafts
const getDraftKey = (id: string) => `draft:${id.toUpperCase()}`

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[KVStore] getDraft: Attempting to get draft with key "${key}"`)
  try {
    const draft = await kv.get<DraftInstance>(key)
    if (draft) {
      console.log(`[KVStore] getDraft: Found draft for key "${key}".`)
    } else {
      console.warn(`[KVStore] getDraft: Draft NOT FOUND for key "${key}".`)
    }
    return draft
  } catch (error) {
    console.error(`[KVStore] getDraft: Error fetching draft with key "${key}" from KV:`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  console.log(`[KVStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  try {
    await kv.set(key, draft, { ex: DRAFT_TTL_SECONDS })
    console.log(`[KVStore] saveDraft: Successfully saved draft with key "${key}" to KV.`)
  } catch (error) {
    console.error(`[KVStore] saveDraft: Error saving draft with key "${key}" to KV:`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[KVStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}

// No more in-memory Map or setInterval cleanup needed.
// KV handles TTL automatically.
