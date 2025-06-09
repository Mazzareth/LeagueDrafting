import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'

// Define the directory where drafts will be stored
const DRAFTS_DIR = path.join(process.cwd(), 'data', 'drafts')

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// In-memory cache for faster access during the same function execution
const draftCache: Record<string, { data: DraftInstance, expiresAt: number }> = {}

// Ensure the drafts directory exists
function ensureDraftsDir() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true })
  }
}

// Helper function to get the file path for a draft
function getDraftFilePath(id: string): string {
  return path.join(DRAFTS_DIR, `${id.toUpperCase()}.json`)
}

// Clean up expired drafts (can be called periodically)
export async function cleanupExpiredDrafts(): Promise<void> {
  console.log('[NextDraftStore] cleanupExpiredDrafts: Cleaning up expired drafts')
  
  try {
    ensureDraftsDir()
    
    const files = fs.readdirSync(DRAFTS_DIR)
    const now = Date.now()
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      
      const filePath = path.join(DRAFTS_DIR, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const draftData = JSON.parse(content)
        
        if (draftData.expiresAt <= now) {
          console.log(`[NextDraftStore] cleanupExpiredDrafts: Removing expired draft file ${file}`)
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error(`[NextDraftStore] cleanupExpiredDrafts: Error processing file ${file}:`, error)
      }
    }
  } catch (error) {
    console.error('[NextDraftStore] cleanupExpiredDrafts: Error cleaning up expired drafts:', error)
  }
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const draftId = id.toUpperCase()
  console.log(`[NextDraftStore] getDraft: Attempting to get draft "${draftId}"`)
  
  try {
    // First check cache for faster access
    const cachedDraft = draftCache[draftId]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[NextDraftStore] getDraft: Found draft "${draftId}" in cache.`)
      return cachedDraft.data
    }
    
    // If not in cache, check file system
    ensureDraftsDir()
    const filePath = getDraftFilePath(draftId)
    
    if (!fs.existsSync(filePath)) {
      console.warn(`[NextDraftStore] getDraft: Draft file not found for "${draftId}".`)
      return null
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const draftData = JSON.parse(fileContent)
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[NextDraftStore] getDraft: Draft "${draftId}" has expired.`)
      fs.unlinkSync(filePath) // Remove expired draft
      return null
    }
    
    // Add to cache for faster access next time
    draftCache[draftId] = draftData
    
    console.log(`[NextDraftStore] getDraft: Successfully loaded draft "${draftId}".`)
    return draftData.data
  } catch (error) {
    console.error(`[NextDraftStore] getDraft: Error fetching draft "${draftId}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const draftId = draft.id.toUpperCase()
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[NextDraftStore] saveDraft: Saving draft "${draftId}" with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    ensureDraftsDir()
    
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to file system
    const filePath = getDraftFilePath(draftId)
    fs.writeFileSync(filePath, JSON.stringify(draftData, null, 2), 'utf-8')
    
    // Also update cache
    draftCache[draftId] = draftData
    
    console.log(`[NextDraftStore] saveDraft: Successfully saved draft "${draftId}".`)
  } catch (error) {
    console.error(`[NextDraftStore] saveDraft: Error saving draft "${draftId}":`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  // Generate a 6-character alphanumeric ID
  const id = nanoid(6).toUpperCase()
  console.log(`[NextDraftStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}