import React from 'react'
import { supabaseAdmin } from '../../lib/supabaseClient'
import { FF_MAPS, FF_MODES, BR_SLOT_OPTIONS, TOURNAMENT_TYPES } from '../../lib/constants'

export function TournamentsAdmin() {
  const [tournaments, setTournaments] = React.useState([])
  const [formOpen, setFormOpen] = React.useState(false)
  const [form, setForm] = React.useState(initialForm())

  const load = async () => {
    const { data, error } = await supabaseAdmin
      .from('tournaments')
      .select('*')
      .order('start_time', { ascending: true })
    if (error) {
      console.error(error)
      setTournaments([])
    } else {
      setTournaments(data || [])
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      entry_fee: Number(form.entry_fee) || 0,
      max_slots: Number(form.max_slots) || 0
    }
    const { error } = await supabaseAdmin.from('tournaments').insert(payload)
    if (error) {
      console.error(error)
      alert('Failed to create tournament')
    } else {
      setForm(initialForm())
      setFormOpen(false)
      load()
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Tournaments</h1>
          <p className="text-xs text-slate-400">Create, manage, and archive tournaments across all supported modes.</p>
        </div>
        <button className="btn-primary text-xs" type="button" onClick={() => setFormOpen(true)}>
          New tournament
        </button>
      </header>

      {formOpen && (
        <div className="card max-w-xl space-y-3 text-xs text-slate-200">
          <h2 className="text-sm font-semibold text-slate-50">Create tournament</h2>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" className="input" value={form.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="label" htmlFor="type">Type</label>
              <select id="type" name="type" className="input" value={form.type} onChange={handleChange}>
                {TOURNAMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="mode">Mode</label>
              <select id="mode" name="mode" className="input" value={form.mode} onChange={handleChange}>
                {FF_MODES.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="format_label">Format label</label>
              <input
                id="format_label"
                name="format_label"
                className="input"
                value={form.format_label}
                onChange={handleChange}
                placeholder="Solo / Duo / Squad / 4v4 / 1v1 / 2v2"
              />
            </div>
            <div>
              <label className="label" htmlFor="map">Map (BR only)</label>
              <select id="map" name="map" className="input" value={form.map} onChange={handleChange}>
                <option value="">None</option>
                {FF_MAPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="entry_fee">Entry fee</label>
              <input id="entry_fee" name="entry_fee" className="input" value={form.entry_fee} onChange={handleChange} />
            </div>
            <div>
              <label className="label" htmlFor="max_slots">Max slots / teams</label>
              <input id="max_slots" name="max_slots" className="input" value={form.max_slots} onChange={handleChange} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="prize_text">Prize distribution (free text)</label>
              <textarea
                id="prize_text"
                name="prize_text"
                rows="3"
                className="input resize-none"
                value={form.prize_text}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="points_table">Points table (free text)</label>
              <textarea
                id="points_table"
                name="points_table"
                rows="3"
                className="input resize-none"
                value={form.points_table}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <button type="submit" className="btn-primary text-xs">Save</button>
              <button type="button" className="btn-secondary text-xs" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto text-xs">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Mode</th>
              <th>Entry</th>
              <th>Slots</th>
              <th>Reg</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.type}</td>
                <td>{t.mode_label}</td>
                <td>₹{t.entry_fee}</td>
                <td>{t.max_slots}</td>
                <td>{t.registration_status}</td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan="6" className="py-4 text-center text-slate-400">No tournaments created yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function initialForm() {
  return {
    title: '',
    type: 'single',
    mode: 'br',
    mode_label: 'Battle Royale',
    format_label: '',
    map: '',
    entry_fee: '',
    max_slots: '',
    prize_text: '',
    points_table: '',
    registration_status: 'open'
  }
}
