export const GAMES = [
  { id: 'free-fire', name: 'Free Fire', status: 'active' },
  { id: 'bgmi', name: 'BGMI', status: 'soon' },
  { id: 'codm', name: 'Call of Duty Mobile', status: 'soon' }
]

export const FF_MAPS = ['Bermuda', 'Bermuda Remastered', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra']

export const FF_MODES = [
  { id: 'br', label: 'Battle Royale' },
  { id: 'cs', label: 'Clash Squad' },
  { id: 'lw', label: 'Lone Wolf' }
]

export const BR_SLOT_OPTIONS = {
  solo: [20, 32, 48],
  duo: [10, 16, 24],
  squad: [5, 8, 12]
}

export const TOURNAMENT_TYPES = [
  { id: 'single', label: 'Single Match' },
  { id: 'long', label: 'Long Tournament' }
]

export function calculateBrPoints(kills, position) {
  const k = Number(kills) || 0
  const p = Number(position) || 1
  return ((k + 1) / p) * 100
}
