export type Role = 'admin' | 'scorer' | 'viewer'
export type Status = 'scheduled' | 'live' | 'paused' | 'final'
/** Result of a form action: shown under the form as a success or error message. */
export type FormState = { ok?: string; error?: string } | null

export type Org = { id: string; name: string; slug: string }
export type Team = {
  id: string; name: string; seed: number
  player1?: string | null; player2?: string | null; bracket_id?: string | null
}
export type Bracket = { id: string; name: string }
export type Tournament = {
  id: string; org_id: string; name: string; date: string | null; courts: number | null
  points_to_win: number; win_by: number; currency: string; status: string
}
export type Match = {
  id: string; tournament_id: string; bracket_id: string | null
  game_no: number; round: string; court: string | null; starts_at: string | null
  team1_id: string | null; team2_id: string | null; slot1_ref: string | null; slot2_ref: string | null
  status: Status; score1: number; score2: number; winner_id: string | null
  team1?: Team | null; team2?: Team | null
  tournament?: { points_to_win: number; win_by: number } | null
}
export type PlayerStat = { player: string; team: string; bracketId: string | null; points: number }
export type Expense = { id: string; tournament_id: string; spent_on: string; category: string; description: string; amount: number }
