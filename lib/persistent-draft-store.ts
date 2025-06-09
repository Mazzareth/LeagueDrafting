import type { DraftInstance } from "@/types/draft"
import * as memoryStore from "./draft-store"
import * as fileStore from "./file-draft-store"

// This store combines memory and file storage for maximum reliability
// Memory store provides fast access, while file store provides persistence across restarts

export async function getDraft(id: string): Promise<DraftInstance | null> {
  console.log(`[PersistentStore] getDraft: Looking for draft "${id}"`)
  
  // First try memory store for speed
  const memoryDraft = await memoryStore.getDraft(id)
  if (memoryDraft) {
    console.log(`[PersistentStore] getDraft: Found draft "${id}" in memory store.`)
    return memoryDraft
  }
  
  // If not in memory, try file store
  console.log(`[PersistentStore] getDraft: Draft "${id}" not in memory, checking file store.`)
  const fileDraft = await fileStore.getDraft(id)
  
  if (fileDraft) {
    console.log(`[PersistentStore] getDraft: Found draft "${id}" in file store, adding to memory.`)
    // Add to memory store for faster access next time
    await memoryStore.saveDraft(fileDraft)
    return fileDraft
  }
  
  console.warn(`[PersistentStore] getDraft: Draft "${id}" not found in any store.`)
  return null
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  console.log(`[PersistentStore] saveDraft: Saving draft "${draft.id}" to all stores.`)
  
  // Save to both stores
  try {
    // Save to memory first for immediate availability
    await memoryStore.saveDraft(draft)
    
    // Then save to file for persistence
    await fileStore.saveDraft(draft)
    
    console.log(`[PersistentStore] saveDraft: Successfully saved draft "${draft.id}" to all stores.`)
  } catch (error) {
    console.error(`[PersistentStore] saveDraft: Error saving draft "${draft.id}":`, error)
    throw error
  }
}

export function generateDraftId(): string {
  // Use either implementation, they do the same thing
  return memoryStore.generateDraftId()
}