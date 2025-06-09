import type { DraftInstance } from "@/types/draft"

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory cache for faster access during the same function execution
const draftCache: Record<string, { data: DraftInstance, expiresAt: number }> = {}

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft:${id.toUpperCase()}`

// Simple localStorage-like interface for browser and Node.js environments
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // In browser, use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      }
      
      // In Node.js, use global object as a fallback
      if (typeof global !== 'undefined') {
        return (global as any).__KV_STORAGE?.[key] || null
      }
      
      return null
    } catch (error) {
      console.error(`[KVStore] getItem error for key "${key}":`, error)
      return null
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      // In browser, use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
        return
      }
      
      // In Node.js, use global object as a fallback
      if (typeof global !== 'undefined') {
        if (!(global as any).__KV_STORAGE) {
          (global as any).__KV_STORAGE = {}
        }
        (global as any).__KV_STORAGE[key] = value
      }
    } catch (error) {
      console.error(`[KVStore] setItem error for key "${key}":`, error)
      throw error
    }
  },
  
  async removeItem(key: string): Promise<void> {
    try {
      // In browser, use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
        return
      }
      
      // In Node.js, use global object as a fallback
      if (typeof global !== 'undefined' && (global as any).__KV_STORAGE) {
        delete (global as any).__KV_STORAGE[key]
      }
    } catch (error) {
      console.error(`[KVStore] removeItem error for key "${key}":`, error)
    }
  }
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[KVStore] getDraft: Attempting to get draft with key "${key}"`)
  
  try {
    // First check cache for faster access
    const cachedDraft = draftCache[key]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[KVStore] getDraft: Found draft "${id}" in cache.`)
      return cachedDraft.data
    }
    
    // If not in cache, check storage
    const storedValue = await storage.getItem(key)
    if (!storedValue) {
      console.warn(`[KVStore] getDraft: Draft not found for key "${key}".`)
      return null
    }
    
    const draftData = JSON.parse(storedValue)
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[KVStore] getDraft: Draft "${id}" has expired.`)
      await storage.removeItem(key)
      return null
    }
    
    // Add to cache for faster access next time
    draftCache[key] = draftData
    
    console.log(`[KVStore] getDraft: Successfully loaded draft "${id}".`)
    return draftData.data
  } catch (error) {
    console.error(`[KVStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[KVStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to storage
    await storage.setItem(key, JSON.stringify(draftData))
    
    // Also update cache
    draftCache[key] = draftData
    
    console.log(`[KVStore] saveDraft: Successfully saved draft "${draft.id}".`)
  } catch (error) {
    console.error(`[KVStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[KVStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}