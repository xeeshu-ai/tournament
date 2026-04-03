import React from 'react'

export function Rules() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">Rules &amp; Fair Play Policy</h1>
        <p className="mt-1 text-xs text-slate-400">
          These rules apply to every Tournvia tournament. Joining any event means you agree with all of them.
        </p>
      </header>

      <section className="card space-y-3 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">Eligibility</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Minimum account level: 45+</li>
          <li>Minimum rank: Diamond 1 or above</li>
          <li>Only mobile devices are allowed. Emulators are strictly banned.</li>
        </ul>
      </section>

      <section className="card space-y-3 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">No emulator / cheat policy</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No emulators of any kind are allowed in any Tournvia lobby.</li>
          <li>No hacks, scripts, GFX tools, ESP, aim assist, or unfair advantages.</li>
          <li>Admins can disqualify or ban any suspicious account without prior warning.</li>
          <li>Repeat offenders can receive a permanent platform ban.</li>
        </ul>
      </section>

      <section className="card space-y-3 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">Refunds</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Entry fees are one-time and non-refundable after your slot is confirmed.</li>
          <li>If you fail to join the room in time, there is no refund.</li>
          <li>If you cannot fill your squad/duo teammates before closing time, you play with whoever accepted.</li>
        </ul>
      </section>

      <section className="card space-y-3 text-xs text-slate-200">
        <h2 className="text-sm font-semibold text-slate-50">Conduct</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No abusive language, targeting, or harassment of players or admins.</li>
          <li>Stream sniping, griefing, or teaming with enemies is not allowed.</li>
          <li>Admins can remove or ban players for any serious violation.</li>
        </ul>
      </section>
    </div>
  )
}
