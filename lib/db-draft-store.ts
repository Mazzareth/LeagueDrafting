import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory cache for faster access
const draftCache: Record<string, { data: DraftInstance, expiresAt: number }> = {}

// Database file path - use a file in the project root for development
const DB_FILE = path.join(process.cwd(), 'drafts-db.json')

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft_${id.toUpperCase()}`

// Helper function to load the database
const loadDatabase = (): Record<string, { data: DraftInstance, expiresAt: number }> => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Create empty database if it doesn't exist
      fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf8')
      return {}
    }
    
    const content = fs.readFileSync(DB_FILE, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error('[DBStore] loadDatabase: Error loading database:', error)
    return {}
  }
}

// Helper function to save the database
const saveDatabase = (db: Record<string, { data: DraftInstance, expiresAt: number }>): void => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
  } catch (error) {
    console.error('[DBStore] saveDatabase: Error saving database:', error)
    throw error
  }
}

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  try {
    const now = Date.now()
    const db = loadDatabase()
    let hasChanges = false
    
    Object.keys(db).forEach(key => {
      if (db[key].expiresAt <= now) {
        console.log(`[DBStore] cleanupExpiredDrafts: Removing expired draft "${key}"`)
        delete db[key]
        hasChanges = true
      }
    })
    
    if (hasChanges) {
      saveDatabase(db)
    }
  } catch (error) {
    console.error('[DBStore] cleanupExpiredDrafts: Error:', error)
  }
}

// Run cleanup every 5 minutes if we're in a non-serverless environment
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 5 * 60 * 1000)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  console.log(`[DBStore] getDraft: Attempting to get draft with key "${key}"`)
  
  try {
    // First check cache for faster access
    const cachedDraft = draftCache[key]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[DBStore] getDraft: Found draft "${id}" in cache.`)
      return cachedDraft.data
    }
    
    // If not in cache, check database
    const db = loadDatabase()
    const draftData = db[key]
    
    if (!draftData) {
      console.warn(`[DBStore] getDraft: Draft not found for key "${key}".`)
      return null
    }
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[DBStore] getDraft: Draft "${id}" has expired.`)
      delete db[key]
      saveDatabase(db)
      return null
    }
    
    // Add to cache for faster access next time
    draftCache[key] = draftData
    
    console.log(`[DBStore] getDraft: Successfully loaded draft "${id}" from database.`)
    return draftData.data
  } catch (error) {
    console.error(`[DBStore] getDraft: Error fetching draft with key "${key}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[DBStore] saveDraft: Saving draft with key "${key}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Load the database
    const db = loadDatabase()
    
    // Update the draft
    db[key] = draftData
    
    // Save the database
    saveDatabase(db)
    
    // Also update cache
    draftCache[key] = draftData
    
    console.log(`[DBStore] saveDraft: Successfully saved draft "${draft.id}" to database.`)
  } catch (error) {
    console.error(`[DBStore] saveDraft: Error saving draft with key "${key}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[DBStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}