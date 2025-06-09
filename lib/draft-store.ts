import type { DraftInstance } from "@/types/draft"

// In-memory store for draft instances. In production, use a database.
const draftInstances = new Map<string, DraftInstance>()
console.log("Draft store initialized (Map created). This log appears on server start/restart.")

export function getDraft(id: string): DraftInstance | undefined {
  console.log(
    `[DraftStore] getDraft: Attempting to get draft with ID "${id}". Current map size: ${draftInstances.size}`,
  )
  const draft = draftInstances.get(id)
  if (draft) {
    console.log(`[DraftStore] getDraft: Found draft for ID "${id}".`)
  } else {
    console.warn(
      `[DraftStore] getDraft: Draft NOT FOUND for ID "${id}". Existing keys: [${Array.from(draftInstances.keys()).join(", ")}]`,
    )
  }
  return draft
}

export function saveDraft(draft: DraftInstance): void {
  draft.updatedAt = Date.now()
  // Store a copy to prevent accidental mutation of the stored object if the original is modified later
  const draftToStore = {
    ...draft,
    blueTeam: { ...draft.blueTeam, bans: [...draft.blueTeam.bans], picks: [...draft.blueTeam.picks] },
    redTeam: { ...draft.redTeam, bans: [...draft.redTeam.bans], picks: [...draft.redTeam.picks] },
    availableChampions: [...draft.availableChampions],
    allChampions: [...draft.allChampions],
  }
  draftInstances.set(draft.id, draftToStore)
  console.log(`[DraftStore] saveDraft: Saved draft with ID "${draft.id}". Current map size: ${draftInstances.size}`)
  console.log(`[DraftStore] saveDraft: Existing keys after save: [${Array.from(draftInstances.keys()).join(", ")}]`)
}

export function generateDraftId(): string {
  const id = Math.random().toString(36).substring(2, 8).toUpperCase()
  console.log(`[DraftStore] generateDraftId: Generated new draft ID "${id}"`)
  return id
}

// Simple cleanup for old drafts (optional, good for in-memory store)
setInterval(
  () => {
    const now = Date.now()
    let deletedCount = 0
    for (const [id, draft] of draftInstances.entries()) {
      if (now - draft.createdAt > 1000 * 60 * 60 * 2) {
        // 2 hours
        draftInstances.delete(id)
        deletedCount++
      }
    }
    if (deletedCount > 0) {
      console.log(`[DraftStore] Cleanup: Deleted ${deletedCount} old draft(s).`)
    }
  },
  1000 * 60 * 30, // Run every 30 minutes
)
