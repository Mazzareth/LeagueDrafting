import type { DraftInstance } from "@/types/draft"
import fs from 'fs'
import path from 'path'

// Time-to-live for draft instances in seconds (e.g., 24 hours)
const DRAFT_TTL_SECONDS = 24 * 60 * 60

// Directory to store draft files - use /tmp which is writable in serverless environments
// Use a simple flat structure to minimize path issues
const DRAFTS_DIR = '/tmp'

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
// Use a simple filename without subdirectories
const getDraftFilePath = (id: string) => path.join(DRAFTS_DIR, `league_draft_${id.toUpperCase()}.json`)

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
    // Log the current directory structure
    console.log(`[ServerlessStore] getDraft: Current directory is ${process.cwd()}`)
    console.log(`[ServerlessStore] getDraft: DRAFTS_DIR is ${DRAFTS_DIR}`)
    
    // First check cache for faster access
    const cachedDraft = draftCache[key]
    if (cachedDraft && cachedDraft.expiresAt > Date.now()) {
      console.log(`[ServerlessStore] getDraft: Found draft "${id}" in cache.`)
      return cachedDraft.data
    } else {
      console.log(`[ServerlessStore] getDraft: Draft "${id}" not found in cache or expired.`)
    }
    
    // List files in /tmp to help with debugging
    try {
      const files = fs.readdirSync('/tmp')
      console.log(`[ServerlessStore] getDraft: Files in /tmp:`, files.join(', '))
    } catch (readDirError) {
      console.error(`[ServerlessStore] getDraft: Error reading /tmp directory:`, readDirError)
    }
    
    // If not in cache or expired, check file system
    if (!fs.existsSync(filePath)) {
      console.warn(`[ServerlessStore] getDraft: Draft file not found for ID "${id}" at path "${filePath}".`)
      
      // Try alternative paths as a fallback
      const alternativePaths = [
        path.join('/tmp', `draft_${id.toUpperCase()}.json`),
        path.join('/tmp', 'league-drafting-drafts', `draft_${id.toUpperCase()}.json`),
        path.join('/tmp', 'drafts', `draft_${id.toUpperCase()}.json`)
      ]
      
      for (const altPath of alternativePaths) {
        console.log(`[ServerlessStore] getDraft: Checking alternative path: ${altPath}`)
        if (fs.existsSync(altPath)) {
          console.log(`[ServerlessStore] getDraft: Found draft at alternative path: ${altPath}`)
          try {
            const content = fs.readFileSync(altPath, 'utf8')
            const draftData = JSON.parse(content)
            
            // Add to cache for faster access next time
            draftCache[key] = draftData
            
            console.log(`[ServerlessStore] getDraft: Successfully loaded draft "${id}" from alternative path.`)
            return draftData.data
          } catch (altError) {
            console.error(`[ServerlessStore] getDraft: Error reading from alternative path:`, altError)
          }
        }
      }
      
      return null
    }
    
    console.log(`[ServerlessStore] getDraft: File exists at ${filePath}, attempting to read...`)
    const content = fs.readFileSync(filePath, 'utf8')
    console.log(`[ServerlessStore] getDraft: Successfully read file content, length: ${content.length} bytes`)
    
    const draftData = JSON.parse(content)
    console.log(`[ServerlessStore] getDraft: Successfully parsed JSON data`)
    
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
    // Log the current directory structure
    console.log(`[ServerlessStore] saveDraft: Current directory is ${process.cwd()}`)
    console.log(`[ServerlessStore] saveDraft: DRAFTS_DIR is ${DRAFTS_DIR}`)
    
    // Make sure the directory exists
    if (!fs.existsSync(DRAFTS_DIR)) {
      fs.mkdirSync(DRAFTS_DIR, { recursive: true })
      console.log(`[ServerlessStore] saveDraft: Created directory ${DRAFTS_DIR}`)
    }
    
    // List files in /tmp to help with debugging
    try {
      const files = fs.readdirSync('/tmp')
      console.log(`[ServerlessStore] saveDraft: Files in /tmp:`, files.join(', '))
    } catch (readDirError) {
      console.error(`[ServerlessStore] saveDraft: Error reading /tmp directory:`, readDirError)
    }
    
    const draftData = {
      data: draft,
      expiresAt: Date.now() + (DRAFT_TTL_SECONDS * 1000)
    }
    
    // Save to file with detailed error handling
    try {
      // Write to a string first to catch JSON stringification errors
      const jsonData = JSON.stringify(draftData, null, 2)
      console.log(`[ServerlessStore] saveDraft: JSON data prepared, length: ${jsonData.length} bytes`)
      
      // Write to file
      fs.writeFileSync(filePath, jsonData, 'utf8')
      
      // Verify the file was written
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        console.log(`[ServerlessStore] saveDraft: File written successfully, size: ${stats.size} bytes`)
      } else {
        console.error(`[ServerlessStore] saveDraft: File was not created at ${filePath}`)
      }
    } catch (writeError) {
      console.error(`[ServerlessStore] saveDraft: Error writing file:`, writeError)
      throw writeError
    }
    
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