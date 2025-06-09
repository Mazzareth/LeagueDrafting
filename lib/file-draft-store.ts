import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// Directory to store draft files
// In serverless environments (AWS Lambda, Vercel), use /tmp which is always writable
// In development, use local directory
let BASE_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd()
let DRAFTS_DIR = path.join(BASE_DIR, 'league-drafting', 'drafts')

// Ensure the drafts directory exists
try {
  // Create directory with recursive option to create all parent directories
  fs.mkdirSync(DRAFTS_DIR, { recursive: true })
  
  // Verify we can write to the directory by creating a test file
  const testFilePath = path.join(DRAFTS_DIR, '.test-write-access')
  fs.writeFileSync(testFilePath, 'test', 'utf8')
  fs.unlinkSync(testFilePath) // Remove the test file
  
  console.log(`[FileStore] Drafts directory set to: ${DRAFTS_DIR}`)
} catch (error) {
  console.error('[FileStore] Error with drafts directory:', error)
  
  // If the first attempt fails, try a simpler path in /tmp
  try {
    DRAFTS_DIR = path.join('/tmp', 'drafts')
    fs.mkdirSync(DRAFTS_DIR, { recursive: true })
    console.log(`[FileStore] Using simplified drafts directory: ${DRAFTS_DIR}`)
  } catch (fallbackError) {
    console.error('[FileStore] Error creating fallback drafts directory:', fallbackError)
  }
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
        // Check if file is accessible
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK)
        
        // Read and parse the file
        const content = fs.readFileSync(filePath, 'utf8')
        const draft = JSON.parse(content)
        
        if (draft.expiresAt <= now) {
          console.log(`[FileStore] cleanupExpiredDrafts: Removing expired draft file "${file}"`)
          try {
            fs.unlinkSync(filePath)
          } catch (unlinkError) {
            console.error(`[FileStore] Error removing expired draft file ${file}:`, unlinkError)
          }
        }
      } catch (error) {
        console.error(`[FileStore] Error processing draft file ${file}:`, error)
        // If the file is corrupted or inaccessible, try to remove it
        try {
          if (fs.existsSync(filePath)) {
            console.log(`[FileStore] cleanupExpiredDrafts: Removing problematic draft file "${file}"`)
            fs.unlinkSync(filePath)
          }
        } catch (removeError) {
          console.error(`[FileStore] Error removing problematic draft file ${file}:`, removeError)
        }
      }
    })
    
    // Also check fallback directory if it exists
    const fallbackDir = path.join('/tmp', 'league-drafting', 'drafts')
    if (fs.existsSync(fallbackDir)) {
      try {
        const fallbackFiles = fs.readdirSync(fallbackDir)
        fallbackFiles.forEach(file => {
          if (!file.endsWith('.json')) return
          
          const filePath = path.join(fallbackDir, file)
          try {
            const content = fs.readFileSync(filePath, 'utf8')
            const draft = JSON.parse(content)
            
            if (draft.expiresAt <= now) {
              console.log(`[FileStore] cleanupExpiredDrafts: Removing expired fallback draft file "${file}"`)
              fs.unlinkSync(filePath)
            }
          } catch (error) {
            console.error(`[FileStore] Error processing fallback draft file ${file}:`, error)
          }
        })
      } catch (fallbackError) {
        console.error('[FileStore] Error cleaning up fallback directory:', fallbackError)
      }
    }
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
      try {
        fs.unlinkSync(filePath) // Remove expired draft
      } catch (unlinkError) {
        console.error(`[FileStore] getDraft: Error removing expired draft file:`, unlinkError)
        // Continue execution even if we can't delete the file
      }
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
  
  console.log(`[FileStore] saveDraft: Saving draft "${draft.id}" to file at ${filePath} with TTL ${DRAFT_TTL_SECONDS}s.`)
  
  try {
    // Make sure the directory exists before writing
    const dirPath = path.dirname(filePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
      console.log(`[FileStore] saveDraft: Created directory ${dirPath}`)
    }
    
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Write directly to the file - in serverless environments, atomic operations aren't as critical
    // since each function execution is isolated
    fs.writeFileSync(filePath, JSON.stringify(draftData, null, 2), 'utf8')
    
    // Verify the file was written correctly
    if (fs.existsSync(filePath)) {
      console.log(`[FileStore] saveDraft: Successfully saved draft "${draft.id}" to file.`)
    } else {
      throw new Error(`File was not created at ${filePath}`)
    }
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