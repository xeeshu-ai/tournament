import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'
import { usePlayer } from '../../lib/PlayerContext'
import { useGame } from '../../lib/GameContext'

const categories = ['Bug Report', 'Cheater Report', 'Match Dispute', 'Payment Issue', 'Other']

export function GameContact() {
  const { profile } = usePlayer()
  const { game } = useGame()

  const [form, setForm] = React.useState({
    category: categories[0],
    name: profile?.full_name || '',
    email: '',
    message: '',
  })
  const [status, setStatus] = React.useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    const { error } = await supabasePlayer.from('contact_messages').insert({
      category: form.category,
      name: form.name,
      email: form.email,
      // Prefix message with game name so admins know which game it's about
      message: `[${game?.name ?? 'Game'}] ${form.message}`,
    })
    if (error) {
      console.error(error)
      setStatus('error')
    } else {
      setStatus('success')
      setForm((f) => ({ ...f, message: '' }))
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">
          Report an Issue
          {game?.name && <span className="ml-2 text-sm font-normal text-slate-400">— {game.name}</span>}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Report a bug, dispute a result, or flag a cheater in {game?.name ?? 'this game'}. Admins review every submission.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-3 text-xs text-slate-200">
        <div>
          <label className="label" htmlFor="gc-category">Category</label>
          <select
            id="gc-category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input bg-slate-900/80"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="gc-name">Your Name</label>
          <input
            id="gc-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="gc-email">Email</label>
          <input
            id="gc-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="gc-message">Details</label>
          <textarea
            id="gc-message"
            name="message"
            rows={4}
            value={form.message}
            onChange={handleChange}
            className="input resize-none"
            placeholder={`Describe the issue in ${game?.name ?? 'this game'}…`}
            required
          />
        </div>
        <button
          type="submit"
          className="btn-primary text-xs"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Sending…' : 'Submit Report'}
        </button>
        {status === 'success' && (
          <p className="text-[11px] text-emerald-300">Report submitted. Admins will review it shortly.</p>
        )}
        {status === 'error' && (
          <p className="text-[11px] text-red-400">Failed to send. Please try again.</p>
        )}
      </form>
    </div>
  )
}
