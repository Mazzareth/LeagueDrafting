"use client"

import type { DraftInstance } from "@/types/draft"

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// Helper function to create a storage key for drafts
const getDraftKey = (id: string) => `draft:${id.toUpperCase()}`

// Client-side storage for drafts using localStorage
export function storeDraftInLocalStorage(draft: DraftInstance): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = getDraftKey(draft.id)
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    localStorage.setItem(key, JSON.stringify(draftData))
    console.log(`[ClientStorage] Saved draft "${draft.id}" to localStorage.`)
  } catch (error) {
    console.error(`[ClientStorage] Error saving draft "${draft.id}" to localStorage:`, error)
  }
}

export function getDraftFromLocalStorage(id: string): DraftInstance | null {
  if (typeof window === 'undefined') return null
  
  try {
    const key = getDraftKey(id)
    const storedValue = localStorage.getItem(key)
    
    if (!storedValue) {
      return null
    }
    
    const draftData = JSON.parse(storedValue)
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      localStorage.removeItem(key)
      return null
    }
    
    return draftData.data
  } catch (error) {
    console.error(`[ClientStorage] Error retrieving draft "${id}" from localStorage:`, error)
    return null
  }
}

// Function to clean up expired drafts from localStorage
export function cleanupExpiredDrafts(): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    const draftKeys: string[] = []
    
    // Collect all draft keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('draft:')) {
        draftKeys.push(key)
      }
    }
    
    // Check each draft for expiration
    for (const key of draftKeys) {
      try {
        const storedValue = localStorage.getItem(key)
        if (storedValue) {
          const draftData = JSON.parse(storedValue)
          if (draftData.expiresAt <= now) {
            localStorage.removeItem(key)
            console.log(`[ClientStorage] Removed expired draft with key "${key}".`)
          }
        }
      } catch (error) {
        console.error(`[ClientStorage] Error processing draft with key "${key}":`, error)
      }
    }
  } catch (error) {
    console.error('[ClientStorage] Error cleaning up expired drafts:', error)
  }
}