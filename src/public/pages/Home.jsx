import React from 'react'
import { Link } from 'react-router-dom'

const PILLARS = [
  {
    title: 'Verified players only',
    body: 'Every account is manually reviewed before approval. Clean lobbies, no spam registrations.',
  },
  {
    title: 'Transparent brackets',
    body: 'Live fixtures, registered team names, and results are always visible — no black boxes.',
  },
  {
    title: 'Clear payment rules',
    body: 'Entry fees, prize pools, and refund policies are shown upfront before you confirm anything.',
  },
]

export function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="flex flex-col items-start gap-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Tournaments live
        </div>

        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          Competitive gaming tournaments,{' '}
          <span className="text-sky-400">done right.</span>
        </h1>

        <p className="max-w-lg text-sm leading-relaxed text-slate-400">
          Tournvia is a tournament platform built for serious players. Register your team, track brackets in real time, and compete for prize pools — all in one place.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/tournaments" className="btn-primary">
            Browse tournaments
          </Link>
          <Link to="/rules" className="btn-secondary">
            Platform rules
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="card h-full">
            <h3 className="text-sm font-semibold text-slate-100">{p.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
