import React from 'react'
import { useGame } from '../../lib/GameContext'

// Per-game rules content — extend this object as you add games
const GAME_RULES = {
  free_fire: [
    {
      title: 'Account & UID',
      rules: [
        'Your Free Fire UID must match the account you actually play on.',
        'Borrowing or sharing accounts for tournaments is strictly prohibited.',
        'UID verification is mandatory before joining any tournament. Unverified accounts cannot register.',
      ],
    },
    {
      title: 'Tournament conduct',
      rules: [
        'You must join the custom room within the scheduled time. Late entries will not be accommodated.',
        'Do not leave the match lobby once the room is open — this counts as a forfeit.',
        'Any form of team-killing, stream sniping, or match throwing will result in disqualification.',
      ],
    },
    {
      title: 'Scoring & results',
      rules: [
        'Points are calculated based on kills and placement as per the tournament format.',
        'Results are final once published. Screenshot-based disputes must be submitted within 24 hours.',
        'Admin decision on any disputed result is final.',
      ],
    },
    {
      title: 'Fair play',
      rules: [
        'Hacking, scripting, or use of any third-party software results in a permanent ban.',
        'Teaming with opponents in solo formats is an instant disqualification.',
        'Players found colluding to manipulate results will be banned from all future events.',
      ],
    },
  ],
  bgmi: [
    {
      title: 'Account & UID',
      rules: [
        'Your BGMI UID must match the account you play on. Multi-account use is banned.',
        'UID verification is required before tournament registration.',
      ],
    },
    {
      title: 'Tournament conduct',
      rules: [
        'Report to the custom room at least 5 minutes before match start.',
        'Match abandonment without valid reason counts as a loss for your team.',
      ],
    },
    {
      title: 'Fair play',
      rules: [
        'Any cheat software, emulator on mobile-only lobbies, or exploit abuse results in an instant ban.',
        'Stream sniping or third-partying by arrangement is not allowed.',
      ],
    },
  ],
}

const FALLBACK_RULES = [
  {
    title: 'General rules',
    rules: [
      'Your game UID must be verified before participating in any tournament.',
      'Join the tournament room on time. Late arrivals forfeit their slot.',
      'Any form of cheating or unsportsmanlike behaviour results in disqualification or ban.',
      'Results are final once published by admins.',
    ],
  },
]

export function GameRules() {
  const { game } = useGame()
  const sections = GAME_RULES[game?.id] ?? FALLBACK_RULES

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">
          {game?.name ?? 'Game'} Rules
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          These rules apply specifically to {game?.name ?? 'this game'} tournaments on Tournvia.
          For platform-wide rules, see the global Rules page.
        </p>
      </header>

      <div className="space-y-4">
        {sections.map((s) => (
          <section key={s.title} className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">{s.title}</h2>
            <ul className="space-y-1.5">
              {s.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-slate-600" />
                  {rule}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
