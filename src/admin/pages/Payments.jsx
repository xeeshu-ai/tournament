import React from 'react'
import { supabaseAdmin } from '../../lib/supabaseClient'

export function Payments() {
  const [requests, setRequests] = React.useState([])

  const load = async () => {
    const { data, error } = await supabaseAdmin
      .from('payment_requests')
      .select('*, tournaments(title)')
      .order('created_at', { ascending: true })
    if (error) {
      console.error(error)
      setRequests([])
    } else {
      setRequests(data || [])
    }
  }

  React.useEffect(() => {
    load()
  }, [])

  const confirm = async (id) => {
    const { error } = await supabaseAdmin
      .from('payment_requests')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) {
      console.error(error)
      alert('Failed to confirm payment')
    } else {
      load()
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Payment confirmations</h1>
        <p className="text-xs text-slate-400">Confirm manual payments and grant tournament slots.</p>
      </header>
      <div className="card overflow-x-auto text-xs">
        <table className="table">
          <thead>
            <tr>
              <th>Host UID</th>
              <th>Tournament</th>
              <th>Team name</th>
              <th>Members</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.host_uid}</td>
                <td>{r.tournaments?.title || '-'}</td>
                <td>{r.team_name}</td>
                <td>{r.team_members_summary || '-'}</td>
                <td>{r.status}</td>
                <td className="text-right">
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      className="btn-primary text-[11px]"
                      onClick={() => confirm(r.id)}
                    >
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="6" className="py-4 text-center text-slate-400">No payment requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
