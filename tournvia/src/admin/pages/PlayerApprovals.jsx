import React from 'react'
import { supabaseAdmin } from '../../lib/supabaseClient'

export function PlayerApprovals() {
  const [pending, setPending] = React.useState([])

  const load = async () => {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      setPending([])
    } else {
      setPending(data || [])
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const updateStatus = async (playerId, status) => {
    const reason = status === 'rejected' ? window.prompt('Reason for rejection:') : null
    const { error } = await supabaseAdmin
      .from('players')
      .update({ status, rejection_reason: reason })
      .eq('id', playerId)
    if (error) {
      console.error(error)
      alert('Failed to update player status')
    } else {
      load()
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Player approvals</h1>
        <p className="text-xs text-slate-400">Manually approve or reject new players and resubmissions.</p>
      </header>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.id}>
                <td>{p.ff_uid}</td>
                <td>{p.full_name}</td>
                <td>{p.email}</td>
                <td>{p.phone || '-'}</td>
                <td>{new Date(p.created_at).toLocaleString()}</td>
                <td className="space-x-2 text-right">
                  <button
                    className="btn-primary text-[11px]"
                    type="button"
                    onClick={() => updateStatus(p.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-secondary text-[11px]"
                    type="button"
                    onClick={() => updateStatus(p.id, 'rejected')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan="6" className="py-4 text-center text-xs text-slate-400">
                  No pending approvals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
