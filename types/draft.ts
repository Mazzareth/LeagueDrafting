import type { Champion } from "@/lib/fetch-champions" // Assuming Champion type is exported

export type PlayerRole = "blue" | "red"

export interface DraftParticipant {
  id: string // Unique client-generated ID
  name: string
  isReady: boolean
}

export interface DraftTeam {
  player?: DraftParticipant
  bans: Champion[]
  picks: Champion[]
}

export interface DraftPhaseAction {
  id: string // e.g., "blue_ban_1"
  team: PlayerRole
  type: "ban" | "pick"
  displayText: string
}

// Defines the sequence of actions in a draft
export const DRAFT_ORDER: DraftPhaseAction[] = [
  { id: "blue_ban_1", team: "blue", type: "ban", displayText: "Blue Team - Ban 1" },
  { id: "red_ban_1", team: "red", type: "ban", displayText: "Red Team - Ban 1" },
  { id: "blue_ban_2", team: "blue", type: "ban", displayText: "Blue Team - Ban 2" },
  { id: "red_ban_2", team: "red", type: "ban", displayText: "Red Team - Ban 2" },
  { id: "blue_ban_3", team: "blue", type: "ban", displayText: "Blue Team - Ban 3" },
  { id: "red_ban_3", team: "red", type: "ban", displayText: "Red Team - Ban 3" },

  { id: "blue_pick_1", team: "blue", type: "pick", displayText: "Blue Team - Pick 1" },
  { id: "red_pick_1", team: "red", type: "pick", displayText: "Red Team - Pick 1" },
  { id: "red_pick_2", team: "red", type: "pick", displayText: "Red Team - Pick 2" },
  { id: "blue_pick_2", team: "blue", type: "pick", displayText: "Blue Team - Pick 2" },
  { id: "blue_pick_3", team: "blue", type: "pick", displayText: "Blue Team - Pick 3" },
  { id: "red_pick_3", team: "red", type: "pick", displayText: "Red Team - Pick 3" },
  { id: "red_pick_4", team: "red", type: "pick", displayText: "Red Team - Pick 4" },
  { id: "blue_pick_4", team: "blue", type: "pick", displayText: "Blue Team - Pick 4" },
  { id: "blue_pick_5", team: "blue", type: "pick", displayText: "Blue Team - Pick 5" },
  { id: "red_pick_5", team: "red", type: "pick", displayText: "Red Team - Pick 5" },
]

export interface DraftInstance {
  id: string // Unique draft code (e.g., 6-char alphanumeric)
  blueTeam: DraftTeam
  redTeam: DraftTeam
  currentPhaseIndex: number // -2: Waiting for Red, -1: Ready Check, 0+: Index in DRAFT_ORDER
  availableChampions: Champion[] // Champions not yet picked or banned
  allChampions: Champion[] // Master list from API
  hostPlayerId: string // Client ID of the host (Blue team)
  createdAt: number
  updatedAt: number
}

// For Server Action responses
export type DraftActionResponse = {
  success: boolean
  message?: string
  draftInstance?: DraftInstance
  draftId?: string // For create action
}
