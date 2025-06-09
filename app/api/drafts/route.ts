import { NextRequest, NextResponse } from 'next/server'
import { getDraft, saveDraft, generateDraftId } from '@/lib/next-draft-store'
import { fetchChampions } from '@/lib/fetch-champions'
import type { DraftInstance } from '@/types/draft'
import { DRAFT_ORDER } from '@/types/draft'

// GET /api/drafts/:id
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const draftId = url.searchParams.get('id')
  
  if (!draftId) {
    return NextResponse.json({ success: false, message: 'Draft ID is required' }, { status: 400 })
  }
  
  try {
    const draft = await getDraft(draftId)
    if (!draft) {
      return NextResponse.json(
        { success: false, message: 'Draft not found' }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, draftInstance: draft })
  } catch (error) {
    console.error(`[API] GET /api/drafts: Error fetching draft "${draftId}":`, error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch draft' }, 
      { status: 500 }
    )
  }
}

// POST /api/drafts - Create a new draft
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId } = body
    
    if (!playerId) {
      return NextResponse.json(
        { success: false, message: 'Player ID is required' }, 
        { status: 400 }
      )
    }
    
    const allChampions = await fetchChampions()
    const draftId = generateDraftId()
    
    const newDraft: DraftInstance = {
      id: draftId,
      hostPlayerId: playerId,
      blueTeam: {
        player: { id: playerId, name: "Blue Player", isReady: false },
        bans: [],
        picks: [],
      },
      redTeam: {
        bans: [],
        picks: [],
      },
      currentPhaseIndex: -2, // Waiting for Red player
      availableChampions: [...allChampions],
      allChampions: [...allChampions],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    await saveDraft(newDraft)
    
    return NextResponse.json({ 
      success: true, 
      draftId: newDraft.id, 
      draftInstance: newDraft 
    })
  } catch (error) {
    console.error('[API] POST /api/drafts: Error creating draft:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create draft instance' }, 
      { status: 500 }
    )
  }
}

// PATCH /api/drafts/:id - Update a draft (join, ready, selection)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { draftId, playerId, action, data } = body
    
    if (!draftId || !playerId || !action) {
      return NextResponse.json(
        { success: false, message: 'Draft ID, Player ID, and action are required' }, 
        { status: 400 }
      )
    }
    
    const draft = await getDraft(draftId)
    if (!draft) {
      return NextResponse.json(
        { success: false, message: 'Draft not found' }, 
        { status: 404 }
      )
    }
    
    // Handle different actions
    switch (action) {
      case 'join':
        // Logic for joining a draft
        if (draft.redTeam.player) {
          if (draft.redTeam.player.id === playerId) {
            return NextResponse.json({ 
              success: true, 
              draftInstance: draft, 
              message: "Rejoined draft." 
            })
          }
          return NextResponse.json(
            { success: false, message: "Draft instance is full." }, 
            { status: 400 }
          )
        }
        
        if (draft.blueTeam.player?.id === playerId) {
          return NextResponse.json({ 
            success: true, 
            draftInstance: draft, 
            message: "You are the host (Blue Team)." 
          })
        }
        
        draft.redTeam.player = { id: playerId, name: "Red Player", isReady: false }
        draft.currentPhaseIndex = -1 // Move to Ready Check
        break
        
      case 'ready':
        // Logic for setting player ready status
        const isReady = data.isReady
        
        if (draft.blueTeam.player?.id === playerId) {
          draft.blueTeam.player.isReady = isReady
        } else if (draft.redTeam.player?.id === playerId) {
          draft.redTeam.player.isReady = isReady
        } else {
          return NextResponse.json(
            { success: false, message: "Player not found in draft." }, 
            { status: 400 }
          )
        }
        
        // Check if both players are ready
        if (draft.blueTeam.player?.isReady && draft.redTeam.player?.isReady && draft.currentPhaseIndex === -1) {
          draft.currentPhaseIndex = 0 // Start drafting
        }
        break
        
      case 'selection':
        // Logic for making a selection (ban/pick)
        const champion = data.champion
        
        if (!champion) {
          return NextResponse.json(
            { success: false, message: "Champion selection is required." }, 
            { status: 400 }
          )
        }
        
        const currentAction = DRAFT_ORDER[draft.currentPhaseIndex]
        const playerTeam =
          draft.blueTeam.player?.id === playerId
            ? draft.blueTeam
            : draft.redTeam.player?.id === playerId
              ? draft.redTeam
              : null
        const playerRole =
          draft.blueTeam.player?.id === playerId ? "blue" : draft.redTeam.player?.id === playerId ? "red" : null
        
        if (!playerTeam || playerRole !== currentAction.team) {
          return NextResponse.json(
            { success: false, message: "Not your turn or player not identified." }, 
            { status: 400 }
          )
        }
        
        // Check if champion is already picked or banned
        const isAlreadySelected = ![
          ...draft.blueTeam.bans,
          ...draft.redTeam.bans,
          ...draft.blueTeam.picks,
          ...draft.redTeam.picks,
        ].every((c) => c.id !== champion.id)
        
        if (isAlreadySelected) {
          return NextResponse.json(
            { success: false, message: "Champion already selected." }, 
            { status: 400 }
          )
        }
        
        if (currentAction.type === "ban") {
          if (playerRole === "blue") draft.blueTeam.bans.push(champion)
          else draft.redTeam.bans.push(champion)
        } else {
          // pick
          if (playerRole === "blue") draft.blueTeam.picks.push(champion)
          else draft.redTeam.picks.push(champion)
        }
        
        draft.availableChampions = draft.availableChampions.filter((c) => c.id !== champion.id)
        draft.currentPhaseIndex++
        
        break
        
      default:
        return NextResponse.json(
          { success: false, message: "Invalid action." }, 
          { status: 400 }
        )
    }
    
    // Save the updated draft
    draft.updatedAt = Date.now()
    await saveDraft(draft)
    
    return NextResponse.json({ success: true, draftInstance: draft })
  } catch (error) {
    console.error('[API] PATCH /api/drafts: Error updating draft:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update draft' }, 
      { status: 500 }
    )
  }
}