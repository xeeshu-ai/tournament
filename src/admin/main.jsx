import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import '../index.css'
import { AdminShell } from './shell/AdminShell'
import { AdminLogin } from './pages/AdminLogin'
import { Dashboard } from './pages/Dashboard'
import { PlayerApprovals } from './pages/PlayerApprovals'
import { TournamentsAdmin } from './pages/TournamentsAdmin'
import { Payments } from './pages/Payments'
import { Complaints } from './pages/Complaints'

ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/master">
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route
          path="/*"
          element={
            <AdminShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/players" element={<PlayerApprovals />} />
                <Route path="/tournaments" element={<TournamentsAdmin />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/complaints" element={<Complaints />} />
              </Routes>
            </AdminShell>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
