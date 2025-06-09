import type { DraftInstance } from "@/types/draft"
import { cookies } from 'next/headers'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory cache for faster access during the same function execution
const draftCache: Record<string, { data: DraftInstance, expiresAt: number }> = {}

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft_${id.toUpperCase()}`

// Helper function to get all drafts from cookies
const getAllDraftsFromCookies = () => {
  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    
    const draftCookies = allCookies.filter(cookie => cookie.name.startsWith('draft_'))
    console.log(`[CookieStore] getAllDraftsFromCookies: Found ${draftCookies.length} draft cookies`)
    
    return draftCookies
  } catch (error) {
    console.error('[CookieStore] getAllDraftsFromCookies: Error getting cookies:', error)
    return []
  }
}

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  try {
    const now = Date.now()
    const cookieStore = cookies()
    const draftCookies = getAllDraftsFromCookies()
    
    draftCookies.forEach(cookie => {
      try {
        const draftData = JSON.parse(cookie.value)
        if (draftData.expiresAt <= now) {
          console.log(`[CookieStore] cleanupExpiredDrafts: Removing expired draft "${cookie.name}"`)
          cookieStore.delete(cookie.name)
        }
      } catch (error) {
        console.error(`[CookieStore] cleanupExpiredDrafts: Error processing cookie ${cookie.name}:`, error)
      }
    })
  } catch (error) {
    console.error('[CookieStore] cleanupExpiredDrafts: Error:', error)
  }
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[CookieStore] getDraft: Attempting to get draft with key "${key}"`)
  
  try {
    // First check cache for faster access
    const cachedDraft = draftCache[key]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[CookieStore] getDraft: Found draft "${id}" in cache.`)
      return cachedDraft.data
    }
    
    // If not in cache, check cookies
    try {
      const cookieStore = cookies()
      const draftCookie = cookieStore.get(key)
      
      if (!draftCookie) {
        console.warn(`[CookieStore] getDraft: Draft cookie not found for key "${key}".`)
        return null
      }
      
      const draftData = JSON.parse(draftCookie.value)
      
      // Check if draft has expired
      if (draftData.expiresAt <= Date.now()) {
        console.warn(`[CookieStore] getDraft: Draft "${id}" has expired.`)
        cookieStore.delete(key)
        return null
      }
      
      // Add to cache for faster access next time
      draftCache[key] = draftData
      
      console.log(`[CookieStore] getDraft: Successfully loaded draft "${id}" from cookie.`)
      return draftData.data
    } catch (cookieError) {
      console.error(`[CookieStore] getDraft: Error accessing cookies:`, cookieError)
      return null
    }
  } catch (error) {
    console.error(`[CookieStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[CookieStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to cookie
    try {
      const cookieStore = cookies()
      
      // Serialize the draft data
      const serializedData = JSON.stringify(draftData)
      
      // Set the cookie with appropriate options
      cookieStore.set(key, serializedData, {
        expires: new Date(draftData.expiresAt),
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      })
      
      console.log(`[CookieStore] saveDraft: Successfully saved draft "${draft.id}" to cookie.`)
    } catch (cookieError) {
      console.error(`[CookieStore] saveDraft: Error setting cookie:`, cookieError)
      throw cookieError
    }
    
    // Also update cache
    draftCache[key] = draftData
  } catch (error) {
    console.error(`[CookieStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[CookieStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}