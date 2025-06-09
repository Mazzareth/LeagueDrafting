import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// Directory to store draft files - use /tmp which is writable in serverless environments
const BASE_DIR = '/tmp'
const DRAFTS_DIR = path.join(BASE_DIR, 'league-drafting-drafts')

// Ensure the drafts directory exists
try {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true })
  console.log(`[ServerlessStore] Created drafts directory at ${DRAFTS_DIR}`)
  
  // Verify we can write to the directory
  const testFilePath = path.join(DRAFTS_DIR, '.test-write-access')
  fs.writeFileSync(testFilePath, 'test', 'utf8')
  fs.unlinkSync(testFilePath) // Remove the test file
} catch (error) {
  console.error('[ServerlessStore] Error with drafts directory:', error)
}

// In-memory cache for faster access
const draftCache: Record<string, { data: DraftInstance, expiresAt: number }> = {}

// Helper function to create a store key for drafts
const getDraftKey = (id: string) => `draft_${id.toUpperCase()}`

// Helper function to get the file path for a draft
const getDraftFilePath = (id: string) => path.join(DRAFTS_DIR, `${getDraftKey(id)}.json`)

// Cleanup function to remove expired drafts
const cleanupExpiredDrafts = () => {
  try {
    if (!fs.existsSync(DRAFTS_DIR)) return
    
    const now = Date.now()
    const files = fs.readdirSync(DRAFTS_DIR)
    
    files.forEach(file => {
      if (!file.endsWith('.json')) return
      
      const filePath = path.join(DRAFTS_DIR, file)
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const draft = JSON.parse(content)
        
        if (draft.expiresAt <= now) {
          console.log(`[ServerlessStore] cleanupExpiredDrafts: Removing expired draft file "${file}"`)
          fs.unlinkSync(filePath)
          
          // Also remove from cache
          const draftId = file.replace('draft_', '').replace('.json', '')
          delete draftCache[getDraftKey(draftId)]
        }
      } catch (error) {
        console.error(`[ServerlessStore] Error processing draft file ${file}:`, error)
      }
    })
  } catch (error) {
    console.error('[ServerlessStore] Error in cleanupExpiredDrafts:', error)
  }
}

// Run cleanup every 5 minutes if we're in a non-serverless environment
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 5 * 60 * 1000)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const key = getDraftKey(id)
  const filePath = getDraftFilePath(id)
  console.log(`[ServerlessStore] getDraft: Attempting to get draft "${id}" from path "${filePath}"`)
  
  try {
    // First check cache for faster access
    const cachedDraft = draftCache[key]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[ServerlessStore] getDraft: Found draft "${id}" in cache.`)
      return cachedDraft.data
    }
    
    // If not in cache or expired, check file system
    if (!fs.existsSync(filePath)) {
      console.warn(`[ServerlessStore] getDraft: Draft file not found for ID "${id}".`)
      return null
    }
    
    const content = fs.readFileSync(filePath, 'utf8')
    const draftData = JSON.parse(content)
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[ServerlessStore] getDraft: Draft "${id}" has expired.`)
      try {
        fs.unlinkSync(filePath) // Remove expired draft
      } catch (unlinkError) {
        console.error(`[ServerlessStore] getDraft: Error removing expired draft file:`, unlinkError)
      }
      return null
    }
    
    // Add to cache for faster access next time
    draftCache[key] = draftData
    
    console.log(`[ServerlessStore] getDraft: Successfully loaded draft "${id}" from file.`)
    return draftData.data
  } catch (error) {
    console.error(`[ServerlessStore] getDraft: Error reading draft "${id}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const key = getDraftKey(draft.id)
  const filePath = getDraftFilePath(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[ServerlessStore] saveDraft: Saving draft "${draft.id}" to file at ${filePath}`)
  
  try {
    // Make sure the directory exists
    if (!fs.existsSync(DRAFTS_DIR)) {
      fs.mkdirSync(DRAFTS_DIR, { recursive: true })
    }
    
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to file
    fs.writeFileSync(filePath, JSON.stringify(draftData, null, 2), 'utf8')
    
    // Also update cache
    draftCache[key] = draftData
    
    console.log(`[ServerlessStore] saveDraft: Successfully saved draft "${draft.id}" to file and cache.`)
  } catch (error) {
    console.error(`[ServerlessStore] saveDraft: Error saving draft "${draft.id}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[ServerlessStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}