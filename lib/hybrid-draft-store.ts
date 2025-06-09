import type { DraftInstance } from "@/types/draft"
import * as kvStore from "./kv-draft-store"
import * as memoryStore from "./draft-store"

// This hybrid store tries to use KV first, then falls back to memory store
// This ensures the app works in both production (with KV) and development (without KV)

export async function getDraft(id: string): Promise<DraftInstance | null> {
  try {
    // Try KV store first
    const draft = await kvStore.getDraft(id)
    if (draft) {
      return draft
    }
    
    // If not found in KV, try memory store as fallback
    console.log(`[HybridStore] getDraft: Not found in KV, trying memory store for "${id}"`)
    return await memoryStore.getDraft(id)
  } catch (error) {
    console.error(`[HybridStore] getDraft: Error in KV store, falling back to memory store for "${id}"`, error)
    // If KV fails, fall back to memory store
    return await memoryStore.getDraft(id)
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  try {
    // Try to save to KV
    await kvStore.saveDraft(draft)
    
    // Also save to memory for redundancy
    await memoryStore.saveDraft(draft)
  } catch (error) {
    console.error(`[HybridStore] saveDraft: Error in KV store, falling back to memory store for "${draft.id}"`, error)
    // If KV fails, at least save to memory
    await memoryStore.saveDraft(draft)
  }
}

export function generateDraftId(): string {
  // Use either implementation, they do the same thing
  return kvStore.generateDraftId()
}