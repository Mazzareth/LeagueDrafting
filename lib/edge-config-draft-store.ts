import type { DraftInstance } from "@/types/draft"
import { nanoid } from 'nanoid'
import { get, getAll, has, set, update } from '@vercel/edge-config'

// Prefix for draft keys in Edge Config
const DRAFT_KEY_PREFIX = 'draft:'

// Helper to create a draft key for Edge Config
const getDraftKey = (id: string) => `${DRAFT_KEY_PREFIX}${id.toUpperCase()}`

// Helper to create a draft metadata key for Edge Config
const getDraftMetaKey = (id: string) => `${DRAFT_KEY_PREFIX}${id.toUpperCase()}:meta`

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const draftId = id.toUpperCase()
  const draftKey = getDraftKey(draftId)
  
  console.log(`[EdgeConfigStore] getDraft: Attempting to get draft "${draftId}"`)
  
  try {
    // Check if the draft exists
    const exists = await has(draftKey)
    
    if (!exists) {
      console.warn(`[EdgeConfigStore] getDraft: Draft not found for "${draftId}".`)
      return null
    }
    
    // Get the draft data
    const draft = await get<DraftInstance>(draftKey)
    
    if (!draft) {
      console.warn(`[EdgeConfigStore] getDraft: Draft data is null for "${draftId}".`)
      return null
    }
    
    console.log(`[EdgeConfigStore] getDraft: Successfully loaded draft "${draftId}".`)
    return draft
  } catch (error) {
    console.error(`[EdgeConfigStore] getDraft: Error fetching draft "${draftId}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const draftId = draft.id.toUpperCase()
  const draftKey = getDraftKey(draftId)
  const metaKey = getDraftMetaKey(draftId)
  
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[EdgeConfigStore] saveDraft: Saving draft "${draftId}"`)
  
  try {
    // Save the draft data
    await set(draftKey, draft)
    
    // Update metadata (last updated timestamp)
    await set(metaKey, { 
      lastUpdated: Date.now(),
      createdAt: draft.createdAt
    })
    
    console.log(`[EdgeConfigStore] saveDraft: Successfully saved draft "${draftId}".`)
  } catch (error) {
    console.error(`[EdgeConfigStore] saveDraft: Error saving draft "${draftId}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  // Generate a 6-character alphanumeric ID
  const id = nanoid(6).toUpperCase()
  console.log(`[EdgeConfigStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}

// Helper function to list all drafts (for admin purposes)
export async function listAllDrafts(): Promise<string[]> {
  try {
    const allItems = await getAll()
    const draftKeys: string[] = []
    
    // Filter keys that start with the draft prefix
    for (const key of Object.keys(allItems)) {
      if (key.startsWith(DRAFT_KEY_PREFIX) && !key.includes(':meta')) {
        // Extract the draft ID from the key
        const draftId = key.substring(DRAFT_KEY_PREFIX.length)
        draftKeys.push(draftId)
      }
    }
    
    return draftKeys
  } catch (error) {
    console.error('[EdgeConfigStore] listAllDrafts: Error listing drafts:', error)
    return []
  }
}