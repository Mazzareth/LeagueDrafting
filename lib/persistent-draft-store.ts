import type { DraftInstance } from "@/types/draft"
import * as memoryStore from "./memory-draft-store"
import * as cookieStore from "./cookie-draft-store"
import * as edgeConfigStore from "./edge-config-draft-store"

// Detect if we're running in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined

// Use Edge Config store as primary when available, otherwise fall back to memory store
const primaryStore = process.env.EDGE_CONFIG ? edgeConfigStore : memoryStore
const fallbackStores = [cookieStore]

// This store uses multiple implementations for maximum reliability
export async function getDraft(id: string): Promise<DraftInstance | null> {
  console.log(`[PersistentStore] getDraft: Looking for draft "${id}" (Serverless: ${isServerless})`)
  
  try {
    // First try the primary store
    try {
      const draft = await primaryStore.getDraft(id)
      if (draft) {
        console.log(`[PersistentStore] getDraft: Found draft "${id}" in primary store.`)
        return draft
      }
    } catch (primaryError) {
      console.error(`[PersistentStore] getDraft: Error in primary store:`, primaryError)
    }
    
    // If not found in primary store, try fallback stores
    for (let i = 0; i < fallbackStores.length; i++) {
      try {
        const fallbackStore = fallbackStores[i]
        const draft = await fallbackStore.getDraft(id)
        if (draft) {
          console.log(`[PersistentStore] getDraft: Found draft "${id}" in fallback store ${i}.`)
          
          // Save to primary store for future requests
          try {
            await primaryStore.saveDraft(draft)
          } catch (saveError) {
            console.error(`[PersistentStore] getDraft: Error saving to primary store:`, saveError)
          }
          
          return draft
        }
      } catch (fallbackError) {
        console.error(`[PersistentStore] getDraft: Error in fallback store ${i}:`, fallbackError)
      }
    }
    
    console.warn(`[PersistentStore] getDraft: Draft "${id}" not found in any store.`)
    return null
  } catch (error) {
    console.error(`[PersistentStore] getDraft: Error getting draft "${id}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  console.log(`[PersistentStore] saveDraft: Saving draft "${draft.id}" (Serverless: ${isServerless})`)
  
  let savedSuccessfully = false
  let lastError: any = null
  
  // Try to save to primary store
  try {
    await primaryStore.saveDraft(draft)
    console.log(`[PersistentStore] saveDraft: Successfully saved draft "${draft.id}" to primary store.`)
    savedSuccessfully = true
  } catch (primaryError) {
    console.error(`[PersistentStore] saveDraft: Error saving to primary store:`, primaryError)
    lastError = primaryError
  }
  
  // Try fallback stores if primary failed
  if (!savedSuccessfully) {
    for (let i = 0; i < fallbackStores.length; i++) {
      try {
        const fallbackStore = fallbackStores[i]
        await fallbackStore.saveDraft(draft)
        console.log(`[PersistentStore] saveDraft: Successfully saved draft "${draft.id}" to fallback store ${i}.`)
        savedSuccessfully = true
        break
      } catch (fallbackError) {
        console.error(`[PersistentStore] saveDraft: Error saving to fallback store ${i}:`, fallbackError)
        lastError = fallbackError
      }
    }
  }
  
  if (!savedSuccessfully) {
    console.error(`[PersistentStore] saveDraft: Failed to save draft "${draft.id}" to any store.`)
    throw lastError || new Error('Failed to save draft to any store')
  }
}

export function generateDraftId(): string {
  return primaryStore.generateDraftId()
}