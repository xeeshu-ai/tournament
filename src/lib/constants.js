// Game definitions — source of truth for all game-related UI
export const GAMES = [
  {
    id: 'free_fire',
    name: 'Free Fire',
    shortName: 'FF',
    status: 'active',
    tagline: 'Battle Royale • Mobile',
    accentColor: '#f97316',       // orange
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
    accentColor: '#3b82f6',       // blue
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
]

export function getGame(gameId) {
  return GAMES.find((g) => g.id === gameId) || null
}

export const ACTIVE_GAMES = GAMES.filter((g) => g.status === 'active')

// BR maps per game
export const MAPS = {
  free_fire: ['Bermuda', 'Bermuda Remastered', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra'],
  bgmi: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik'],
}

export const MODES = [
  { id: 'br', label: 'Battle Royale' },
  { id: 'cs', label: 'Clash Squad' },
  { id: 'lw', label: 'Lone Wolf' },
]

// Keep backward-compat aliases
export const FF_MODES = MODES
export const FF_MAPS = MAPS.free_fire

export const TEAM_SIZES = [
  { id: 1, label: 'Solo' },
  { id: 2, label: 'Duo' },
  { id: 4, label: 'Squad' },
]

export const BR_SLOT_OPTIONS = {
  solo: [20, 32, 48],
  duo: [10, 16, 24],
  squad: [5, 8, 12],
}

export const TOURNAMENT_TYPES = [
  { id: 'single', label: 'Single Match' },
  { id: 'long', label: 'Long Tournament' },
]

export function getModeLabel(t) {
  if (!t?.mode) return ''
  return MODES.find((m) => m.id === t.mode)?.label || t.mode
}

export function calculateBrPoints(kills, position) {
  const k = Number(kills) || 0
  const p = Number(position) || 1
  return ((k + 1) / p) * 100
}
