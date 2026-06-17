export interface PlayerStats {
  value: number;
  popularity: number;
  growth: number;
  totalGrowth: number;
  trend: number;
  events: {
    round: Record<string, number>;
    total: Record<string, number>;
  };
}

export interface Player {
  id: string;
  name: string;
  team: string;
  pos: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number; // Value in millions (e.g. 5.0)
  own: number; // Ownership rate in % (e.g. 4.9)
  active: boolean;
  stats: PlayerStats;
}

export interface SquadPlayer extends Player {
  isCaptain: boolean;
}

export interface RoundConfig {
  id: number;
  label: string;
  budget: number; // in millions, e.g. 50.0
  transferFeePercent: number; // e.g. 0.7
  maxPlayersPerTeam: number; // e.g. 4
  closeDate: string;
}

export interface MatchdayFixture {
  id: number;
  home: string;
  away: string;
  day: number;
  date: string;
  time: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeCleanSheetProb: number;
  awayCleanSheetProb: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
}

export interface MatchScore {
  home: number;
  away: number;
  finished: boolean;
}

export interface LivePlayerScore {
  goals: number;
  assists: number;
  ownGoals: number;
  cleanSheet: boolean;
  conceded: number;
  shotsOnGoal: number;
  saves: number;
  yellowCard: boolean;
  redCard: boolean;
  played: boolean;
  manOfTheMatch: boolean;
  victory: boolean;
  draw: boolean;
}

export interface TransferSuggestion {
  sell: Player;
  buy: Player;
  evGain: number;
  netValueChange: number;
}
