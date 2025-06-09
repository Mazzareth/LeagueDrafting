import type { DraftInstance } from "@/types/draft"
import { nanoid } from 'nanoid'
import { createClient } from '@vercel/edge-config'

// Create Edge Config client with token if available
const edgeConfig = process.env.EDGE_CONFIG && process.env.EDGE_CONFIG_TOKEN
  ? createClient({
      connectionString: `${process.env.EDGE_CONFIG}_${process.env.EDGE_CONFIG_TOKEN}`
    })
  : null

export async function getDraft(id: string): Promise<DraftInstance | null> {
  if (!edgeConfig) {
    console.error('[EdgeConfigStore] getDraft: Edge Config client not initialized')
    return null
  }

  const draftId = id.toUpperCase()
  
  console.log(`[EdgeConfigStore] getDraft: Attempting to get draft "${draftId}"`)
  
  try {
    // Check if drafts container exists
    const draftsExists = await edgeConfig.has('drafts')
    
    if (!draftsExists) {
      console.warn(`[EdgeConfigStore] getDraft: Drafts container not found.`)
      return null
    }
    
    // Get all drafts
    const drafts = await edgeConfig.get<Record<string, DraftInstance>>('drafts')
    
    if (!drafts || !drafts[draftId]) {
      console.warn(`[EdgeConfigStore] getDraft: Draft not found for "${draftId}".`)
      return null
    }
    
    console.log(`[EdgeConfigStore] getDraft: Successfully loaded draft "${draftId}".`)
    return drafts[draftId]
  } catch (error) {
    console.error(`[EdgeConfigStore] getDraft: Error fetching draft "${draftId}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  if (!edgeConfig) {
    console.error('[EdgeConfigStore] saveDraft: Edge Config client not initialized')
    throw new Error('Edge Config client not initialized')
  }

  const draftId = draft.id.toUpperCase()
  
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[EdgeConfigStore] saveDraft: Saving draft "${draftId}"`)
  
  try {
    // Check if drafts container exists
    const draftsExists = await edgeConfig.has('drafts')
    
    // Get current drafts or initialize empty object
    const drafts = draftsExists 
      ? await edgeConfig.get<Record<string, DraftInstance>>('drafts') 
      : {}
    
    // Update the draft in the collection
    const updatedDrafts = {
      ...drafts,
      [draftId]: draft
    }
    
    // Save the updated drafts collection
    await edgeConfig.set('drafts', updatedDrafts)
    
    // Update metadata
    const metaExists = await edgeConfig.has('draft_meta')
    const meta = metaExists 
      ? await edgeConfig.get<Record<string, { lastUpdated: number, createdAt: number }>>('draft_meta') 
      : {}
    
    const updatedMeta = {
      ...meta,
      [draftId]: { 
        lastUpdated: Date.now(),
        createdAt: draft.createdAt
      }
    }
    
    await edgeConfig.set('draft_meta', updatedMeta)
    
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
  if (!edgeConfig) {
    console.error('[EdgeConfigStore] listAllDrafts: Edge Config client not initialized')
    return []
  }

  try {
    const draftsExists = await edgeConfig.has('drafts')
    
    if (!draftsExists) {
      return []
    }
    
    const drafts = await edgeConfig.get<Record<string, DraftInstance>>('drafts')
    
    return Object.keys(drafts)
  } catch (error) {
    console.error('[EdgeConfigStore] listAllDrafts: Error listing drafts:', error)
    return []
  }
}