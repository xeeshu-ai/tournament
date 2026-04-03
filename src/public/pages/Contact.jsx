import React from 'react'
import { supabasePlayer } from '../../lib/supabaseClient'

const categories = ['Bug Report', 'Complaint', 'Feedback', 'Other']

export function Contact() {
  const [form, setForm] = React.useState({ category: categories[0], name: '', email: '', message: '' })
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
      message: form.message
    })
    if (error) {
      console.error(error)
      setStatus('error')
    } else {
      setStatus('success')
      setForm({ category: categories[0], name: '', email: '', message: '' })
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">Contact &amp; Feedback</h1>
        <p className="mt-1 text-xs text-slate-400">
          Found a bug, have a complaint, or want to suggest a feature? Send it here — admins read every submission.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-3 text-xs text-slate-200">
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
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
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows="4"
            value={form.message}
            onChange={handleChange}
            className="input resize-none"
            required
          />
        </div>
        <button type="submit" className="btn-primary text-xs" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send message'}
        </button>
        {status === 'success' && (
          <p className="text-[11px] text-emerald-300">Message sent. Admins will review it from the master panel.</p>
        )}
        {status === 'error' && (
          <p className="text-[11px] text-red-400">Failed to send. Please try again later.</p>
        )}
      </form>
    </div>
  )
}
