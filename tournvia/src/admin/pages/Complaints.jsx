import React from 'react'
import { supabaseAdmin } from '../../lib/supabaseClient'

export function Complaints() {
  const [items, setItems] = React.useState([])

  const load = async () => {
    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error(error)
      setItems([])
    } else {
      setItems(data || [])
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const markReviewed = async (id) => {
    const { error } = await supabaseAdmin
      .from('contact_messages')
      .update({ is_reviewed: true })
      .eq('id', id)
    if (error) {
      console.error(error)
      alert('Failed to update')
    } else {
      load()
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Complaints &amp; feedback</h1>
        <p className="text-xs text-slate-400">All messages submitted from the public contact form.</p>
      </header>
      <div className="space-y-3">
        {items.map((m) => (
          <div
            key={m.id}
            className="card space-y-1 border-slate-700/80 text-xs text-slate-200"
          >
            <p className="text-[11px] text-slate-400">
              {m.category} • {new Date(m.created_at).toLocaleString()}
            </p>
            <p className="font-semibold text-slate-50">{m.name} ({m.email})</p>
            <p className="whitespace-pre-line text-slate-200">{m.message}</p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                {m.is_reviewed ? 'Reviewed' : 'Not reviewed yet'}
              </span>
              {!m.is_reviewed && (
                <button
                  className="btn-secondary text-[11px]"
                  type="button"
                  onClick={() => markReviewed(m.id)}
                >
                  Mark as reviewed
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-400">No complaints or feedback yet.</p>
        )}
      </div>
    </div>
  )
}
