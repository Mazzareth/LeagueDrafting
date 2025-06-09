import type { DraftInstance } from "@/types/draft"
import * as memoryStore from "./draft-store"
import * as serverlessStore from "./serverless-draft-store"

// Detect if we're running in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined

// Choose the appropriate store based on environment
const store = isServerless ? serverlessStore : memoryStore

// This store uses the appropriate implementation based on the environment
export async function getDraft(id: string): Promise<DraftInstance | null> {
  console.log(`[PersistentStore] getDraft: Looking for draft "${id}" (Serverless: ${isServerless})`)
  
  try {
    const draft = await store.getDraft(id)
    
    if (draft) {
      console.log(`[PersistentStore] getDraft: Found draft "${id}".`)
      return draft
    }
    
    console.warn(`[PersistentStore] getDraft: Draft "${id}" not found.`)
    return null
  } catch (error) {
    console.error(`[PersistentStore] getDraft: Error getting draft "${id}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  console.log(`[PersistentStore] saveDraft: Saving draft "${draft.id}" (Serverless: ${isServerless})`)
  
  try {
    await store.saveDraft(draft)
    console.log(`[PersistentStore] saveDraft: Successfully saved draft "${draft.id}".`)
  } catch (error) {
    console.error(`[PersistentStore] saveDraft: Error saving draft "${draft.id}":`, error)
    throw error
  }
}

export function generateDraftId(): string {
  return store.generateDraftId()
}