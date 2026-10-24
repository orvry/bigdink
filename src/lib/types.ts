export type Status = 'scheduled' | 'live' | 'paused' | 'final'

export type Team = {
  id: string; name: string; seed: number
  player1?: string | null; player2?: string | null; bracket_id?: string | null
}
export type Bracket = { id: string; name: string }
export type Tournament = {
  id: string; name: string; date: string | null; courts: number | null
  points_to_win: number; win_by: number; status: string
}
export type Match = {
  id: string; tournament_id: string; bracket_id: string | null
  game_no: number; round: string; court: string | null; starts_at: string | null
  team1_id: string | null; team2_id: string | null; slot1_ref: string | null; slot2_ref: string | null
  status: Status; score1: number; score2: number; winner_id: string | null
  team1?: Team | null; team2?: Team | null
  tournament?: { points_to_win: number; win_by: number } | null
}
