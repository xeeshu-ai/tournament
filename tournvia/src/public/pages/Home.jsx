import React from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../../lib/constants'

export function Home() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 md:grid-cols-[1.6fr_1.1fr] md:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Free Fire tournaments live
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
            Host and play clutch Free Fire tournaments with <span className="text-sky-400">zero emulator nonsense</span>.
          </h1>
          <p className="max-w-xl text-sm text-slate-300">
            Tournvia is a premium Free Fire esports platform built for serious mobile players. Clean brackets, fair rules, manual verification, and live YouTube coverage for every highlighted match.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/tournaments" className="btn-primary">
              Browse tournaments
            </Link>
            <Link to="/rules" className="btn-secondary">
              Read rules
            </Link>
            <p className="text-[11px] text-slate-400">
              Level 45+ • Diamond 1+ • Mobile only
            </p>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-500/20 via-emerald-400/10 to-fuchsia-500/10 blur-3xl" />
          <div className="relative rounded-3xl border border-sky-500/30 bg-slate-900/80 p-5 shadow-[0_0_60px_rgba(56,189,248,0.5)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Modes supported
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="font-medium text-slate-100">Battle Royale</span>
                <span className="text-[11px] text-slate-400">Solo • Duo • Squad</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-slate-100">Clash Squad</span>
                <span className="text-[11px] text-slate-400">4v4 • Skills & ammo options</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-medium text-slate-100">Lone Wolf</span>
                <span className="text-[11px] text-slate-400">1v1 • 2v2 knockout</span>
              </li>
            </ul>
            <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
              {GAMES.map((game) => (
                <div
                  key={game.id}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-2 py-2 text-center"
                >
                  <p className="font-semibold text-slate-100">{game.name}</p>
                  <p
                    className={
                      game.status === 'active'
                        ? 'mt-1 text-emerald-400'
                        : 'mt-1 text-amber-400'
                    }
                  >
                    {game.status === 'active' ? 'Live now' : 'Coming soon'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <HomeStat title="Manual verification" body="Every player is manually checked before approval. No random UID spam, no obvious cheaters." />
        <HomeStat title="Transparent brackets" body="Registered team names, live fixtures, and winners are always visible on the tournament page." />
        <HomeStat title="No refund drama" body="Entry rules are crystal clear. One-time fee, no refund after joining — shown before you confirm." />
      </section>
    </div>
  )
}

function HomeStat({ title, body }) {
  return (
    <div className="card h-full">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-xs text-slate-300">{body}</p>
    </div>
  )
}
