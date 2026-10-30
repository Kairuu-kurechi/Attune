import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { LiveSession } from '@/pages/LiveSession'
import { AttendeeView } from '@/pages/AttendeeView'
import { ReportView } from '@/pages/ReportView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/session/:sessionId" element={<LiveSession />} />
        <Route path="/attendee/:sessionId" element={<AttendeeView />} />
        <Route path="/report/:sessionId" element={<ReportView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster theme="dark" richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
