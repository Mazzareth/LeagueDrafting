import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// Directory to store draft files
const DRAFTS_DIR = path.join(process.cwd(), 'data', 'drafts')

// Ensure the drafts directory exists
try {
  if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'))
  }
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR)
  }
} catch (error) {
  console.error('[FileStore] Error creating drafts directory:', error)
}

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
          console.log(`[FileStore] cleanupExpiredDrafts: Removing expired draft file "${file}"`)
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error(`[FileStore] Error processing draft file ${file}:`, error)
      }
    })
  } catch (error) {
    console.error('[FileStore] Error in cleanupExpiredDrafts:', error)
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredDrafts, 5 * 60 * 1000)
}

export async function getDraft(id: string): Promise<DraftInstance | null> {
  const filePath = getDraftFilePath(id)
  console.log(`[FileStore] getDraft: Attempting to get draft from file "${filePath}"`)
  
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[FileStore] getDraft: Draft file not found for ID "${id}".`)
      return null
    }
    
    const content = fs.readFileSync(filePath, 'utf8')
    const draftData = JSON.parse(content)
    
    // Check if draft has expired
    if (draftData.expiresAt <= Date.now()) {
      console.warn(`[FileStore] getDraft: Draft "${id}" has expired.`)
      fs.unlinkSync(filePath) // Remove expired draft
      return null
    }
    
    console.log(`[FileStore] getDraft: Successfully loaded draft "${id}" from file.`)
    return draftData.data
  } catch (error) {
    console.error(`[FileStore] getDraft: Error reading draft file for ID "${id}":`, error)
    return null
  }
}

export async function saveDraft(draft: DraftInstance): Promise<void> {
  const filePath = getDraftFilePath(draft.id)
  draft.updatedAt = Date.now() // Ensure updatedAt is set before saving
  
  console.log(`[FileStore] saveDraft: Saving draft "${draft.id}" to file with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    fs.writeFileSync(filePath, JSON.stringify(draftData, null, 2), 'utf8')
    console.log(`[FileStore] saveDraft: Successfully saved draft "${draft.id}" to file.`)
  } catch (error) {
    console.error(`[FileStore] saveDraft: Error saving draft "${draft.id}" to file:`, error)
    throw error // Rethrow to allow Server Action to handle it
  }
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[FileStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}