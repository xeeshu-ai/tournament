// Game definitions — source of truth for all game-related UI
export const GAMES = [
  {
    id: 'free_fire',
    name: 'Free Fire',
    shortName: 'FF',
    status: 'active',
    tagline: 'Battle Royale • Mobile',
    accentColor: '#f97316',
    bgClass: 'from-orange-950/60 to-slate-950',
    borderClass: 'border-orange-500/30',
    badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    uidLabel: 'Free Fire UID',
    uidPlaceholder: 'e.g. 123456789',
    uidHint: 'Find your UID in-game: Profile → top-left number.',
    minLevel: 45,
    minRank: 'Diamond 1',
  },
  {
    id: 'bgmi',
    name: 'BGMI',
    shortName: 'BGMI',
    status: 'active',
    tagline: 'Battle Royale • Mobile',
    accentColor: '#3b82f6',
    bgClass: 'from-blue-950/60 to-slate-950',
    borderClass: 'border-blue-500/30',
    badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    uidLabel: 'BGMI Character ID',
    uidPlaceholder: 'e.g. 5123456789',
    uidHint: 'Find your Character ID in-game: Profile → ID below your name.',
    minLevel: 30,
    minRank: 'Platinum 1',
  },
  {
    id: 'valorant',
    name: 'Valorant',
    shortName: 'VAL',
    status: 'coming_soon',
    tagline: 'Tactical Shooter • PC',
    accentColor: '#ef4444',
    bgClass: 'from-red-950/40 to-slate-950',
    borderClass: 'border-red-500/20',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    uidLabel: 'Riot ID',
    uidPlaceholder: 'e.g. Player#1234',
    uidHint: '',
    minLevel: null,
    minRank: null,
  },
  {
    id: 'cod_mobile',
    name: 'COD Mobile',
    shortName: 'CODM',
    status: 'coming_soon',
    tagline: 'Battle Royale • Mobile',
    accentColor: '#84cc16',
    bgClass: 'from-lime-950/40 to-slate-950',
    borderClass: 'border-lime-500/20',
    badgeClass: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    uidLabel: 'Activision ID',
    uidPlaceholder: 'e.g. Player#1234567',
    uidHint: '',
    minLevel: null,
    minRank: null,
  },
];

export function getGame(gameId) {
  return GAMES.find((g) => g.id === gameId) || null;
}

export const ACTIVE_GAMES = GAMES.filter((g) => g.status === 'active');

// BR maps per game
export const MAPS = {
  free_fire: ['Bermuda', 'Bermuda Remastered', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra'],
  // BGMI 100-player BR maps
  bgmi: ['Erangel', 'Miramar', 'Rondo', 'Sanhok', 'Vikendi', 'Livik', 'Nusa', 'Deston'],
};

// TDM maps per game
export const TDM_MAPS = {
  bgmi: ['Hangar', 'Warehouse'],
};

// Modes per game
export const MODES_BY_GAME = {
  free_fire: [
    { id: 'br', label: 'Battle Royale' },
    { id: 'cs', label: 'Clash Squad' },
    { id: 'lw', label: 'Lone Wolf' },
  ],
  bgmi: [
    { id: 'br', label: 'Battle Royale' },
    { id: 'tdm', label: 'TDM' },
  ],
};

export function getModesForGame(gameId) {
  return MODES_BY_GAME[gameId] ?? MODES_BY_GAME.free_fire;
}

export function getMapsForGame(gameId, mode) {
  if (mode === 'tdm') return TDM_MAPS[gameId] ?? [];
  return MAPS[gameId] ?? MAPS.free_fire;
}

export const MODES = [
  { id: 'br', label: 'Battle Royale' },
  { id: 'cs', label: 'Clash Squad' },
  { id: 'lw', label: 'Lone Wolf' },
  { id: 'tdm', label: 'TDM' },
];

export function getModeLabel(gameId, modeId) {
  const modes = getModesForGame(gameId);
  return modes.find((m) => m.id === modeId)?.label || modeId?.toUpperCase() || '';
}

// Keep backward-compat aliases
export const FF_MODES = MODES_BY_GAME.free_fire;
export const FF_MAPS = MAPS.free_fire;

export const TEAM_SIZES = [
  { id: 1, label: 'Solo' },
  { id: 2, label: 'Duo' },
  { id: 4, label: 'Squad' },
];

// BR max slots per team size
// BGMI: 100-player lobby → Solo=100, Duo=50, Squad=25
// FF:   48-player lobby  → Solo=48,  Duo=24, Squad=12
export const BR_SLOT_OPTIONS = {
  // Free Fire
  ff_solo: [20, 32, 48],
  ff_duo: [10, 16, 24],
  ff_squad: [5, 8, 12],
  // BGMI (fixed)
  bgmi_solo: [100],
  bgmi_duo: [50],
  bgmi_squad: [25],
  // Generic fallback
  solo: [20, 32, 48, 100],
  duo: [10, 16, 24, 50],
  squad: [5, 8, 12, 25],
};

export const TOURNAMENT_TYPES = [
  { id: 'single', label: 'Single Match' },
  { id: 'long', label: 'Long Tournament' },
];

/**
 * BR scoring formula (applies to both BGMI and Free Fire):
 *   Base points  = Math.round(((kills + 1) / position) * 10)
 *   Finish bonus = 10 for 1st, 7 for 2nd, 5 for 3rd, 3 for 4th, 0 otherwise
 *   Total        = base + finish bonus
 */
export const BR_FINISH_BONUS = { 1: 10, 2: 7, 3: 5, 4: 3 };

export function calculateBrPoints(kills, position) {
  const k = Number(kills) || 0;
  const p = Number(position) || 1;
  const base = Math.round(((k + 1) / p) * 10);
  const bonus = BR_FINISH_BONUS[p] ?? 0;
  return base + bonus;
}

/**
 * Returns the number of teams per match lobby for a given tournament.
 *
 * BGMI: lobby is always 100 players, so teams = 100 ÷ team_size
 *   Squad (4)  → 25 teams
 *   Duo   (2)  → 50 teams
 *   Solo  (1)  → 100 teams
 *
 * Free Fire: lobby capacity is stored in players_per_match, so teams = players_per_match ÷ team_size
 *
 * Never read players_per_match for BGMI — the admin may have left it null or set
 * an incorrect value; the engine always uses exactly 100 players.
 *
 * @param {{ game_id: string, team_size: number, players_per_match?: number }} tournament
 * @returns {number|null} teams per match, or null if data is insufficient
 */
export function getTeamsPerMatch(tournament) {
  const teamSize = Number(tournament?.team_size);
  if (!teamSize || teamSize < 1) return null;

  if (tournament?.game_id === 'bgmi') {
    return Math.floor(100 / teamSize);
  }

  // Free Fire (and any future game that uses players_per_match)
  const ppm = Number(tournament?.players_per_match);
  if (!ppm || ppm < 1) return null;
  return Math.floor(ppm / teamSize);
}
