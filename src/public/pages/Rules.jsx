import React from 'react'

const SECTIONS = [
  {
    title: 'Account integrity',
    rules: [
      'You must register with your real name and a valid game UID.',
      'One account per person. Duplicate accounts will be permanently banned.',
      'Your game profile must pass admin verification before you can join any tournament.',
      'Sharing or selling your Tournvia account to another person is not allowed.',
    ],
  },
  {
    title: 'Tournament participation',
    rules: [
      'You must join the tournament room within the scheduled time window.',
      'Late arrivals forfeit their slot — no exceptions, no refunds.',
      'If you register as a team, all teammates must also have verified accounts.',
      'Admins can remove any team from a tournament for misconduct without prior notice.',
    ],
  },
  {
    title: 'Fair play',
    rules: [
      'Any form of cheating, hacking, scripting, or use of unfair software is an instant permanent ban.',
      'Teaming with opponents, stream sniping, or intentional griefing will result in disqualification.',
      'Results are final once published by admins. Screenshot disputes must be raised within 24 hours.',
      'Admins reserve the right to review and overturn any result if fraud is suspected.',
    ],
  },
  {
    title: 'Payments & refunds',
    rules: [
      'Entry fees are non-refundable once your slot is confirmed.',
      'If a tournament is cancelled by Tournvia, a full refund will be processed within 3 business days.',
      'Prize payouts are made within 48 hours of results being finalized.',
      'Any attempt to dispute a payment through a third party will result in a permanent ban.',
    ],
  },
  {
    title: 'Conduct',
    rules: [
      'Abusive language, harassment, or threats toward any player or admin will not be tolerated.',
      'Public complaints or false accusations against other players must be raised through official channels.',
      'Tournvia admins have final authority on all platform decisions.',
    ],
  },
]

export function Rules() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Platform Rules</h1>
        <p className="mt-1 text-xs text-slate-400">
          These rules apply to every tournament on Tournvia. Registering for any event means you agree to all of them.
        </p>
      </header>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
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
