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

// Attempt to load drafts from localStorage on server start (client-side only)
const loadDraftsFromStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      const storedDrafts = localStorage.getItem('league_drafts')
      if (storedDrafts) {
        const parsedDrafts = JSON.parse(storedDrafts) as DraftStore
        
        // Only load non-expired drafts
        const now = Date.now()
        Object.keys(parsedDrafts).forEach(key => {
          if (parsedDrafts[key].expiresAt > now) {
            draftStore[key] = parsedDrafts[key]
            console.log(`[EnhancedStore] Loaded draft "${key}" from localStorage`)
          }
        })
      }
    } catch (error) {
      console.error('[EnhancedStore] Error loading drafts from localStorage:', error)
    }
  }
}

// Save all drafts to localStorage (client-side only)
const saveDraftsToStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      // Clean expired drafts before saving
      cleanupExpiredDrafts()
      
      localStorage.setItem('league_drafts', JSON.stringify(draftStore))
      console.log('[EnhancedStore] Saved all drafts to localStorage')
    } catch (error) {
      console.error('[EnhancedStore] Error saving drafts to localStorage:', error)
    }
  }
}

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  const now = Date.now()
  Object.keys(draftStore).forEach(key => {
    if (draftStore[key].expiresAt <= now) {
      console.log(`[EnhancedStore] cleanupExpiredDrafts: Removing expired draft "${key}"`)
      delete draftStore[key]
    }
  })
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 60 * 1000)
  
  // Also periodically save to localStorage
  setInterval(saveDraftsToStorage, 30 * 1000)
}

// Try to load drafts on initialization (client-side only)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after the component is mounted
  setTimeout(loadDraftsFromStorage, 0)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[EnhancedStore] getDraft: Attempting to get draft with key "${key}"`)
  try {
    const draft = draftStore[key]
    if (draft && draft.expiresAt > Date.now()) {
      console.log(`[EnhancedStore] getDraft: Found draft for key "${key}".`)
      return draft.data
    } else {
      if (draft) {
        // Clean up expired draft
        delete draftStore[key]
        saveDraftsToStorage() // Update localStorage
      }
      console.warn(`[EnhancedStore] getDraft: Draft NOT FOUND for key "${key}".`)
      return null
    }
  } catch (error) {
    console.error(`[EnhancedStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  console.log(`[EnhancedStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  try {
    draftStore[key] = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to localStorage if available
    saveDraftsToStorage()
    
    console.log(`[EnhancedStore] saveDraft: Successfully saved draft with key "${key}".`)
  } catch (error) {
    console.error(`[EnhancedStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[EnhancedStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}