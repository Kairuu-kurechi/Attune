import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { LiveSession } from '@/pages/LiveSession'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/session/:sessionId" element={<LiveSession />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
