import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Public pages
import Home from '@/pages/Home'
import SmeFinance from '@/pages/SmeFinance'
import ProjectFunding from '@/pages/ProjectFunding'
import HowItWorksPage from '@/pages/HowItWorks'
import About from '@/pages/About'
import Team from '@/pages/Team'
import Insights from '@/pages/Insights'
import Contact from '@/pages/Contact'

// Auth pages
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import VerifyEmail from '@/pages/auth/VerifyEmail'
import SignupProfile from '@/pages/auth/SignupProfile'

// Admin pages
import Admin from '@/pages/Admin'
import ApplicationWorkspace from '@/pages/admin/ApplicationWorkspace'

// Dashboard shell
import DashboardLayout from '@/layouts/DashboardLayout'

// Dashboard pages
import Overview from '@/pages/dashboard/Overview'
import MyApplication from '@/pages/dashboard/MyApplication'
import StartApplication from '@/pages/dashboard/StartApplication'
import Modelling from '@/pages/dashboard/Modelling'
import DocumentsPage from '@/pages/dashboard/DocumentsPage'
import DocChecklist from '@/pages/dashboard/DocChecklist'
import MessagesPage from '@/pages/dashboard/MessagesPage'
import FeesPage from '@/pages/dashboard/FeesPage'
import Eligibility from '@/pages/dashboard/Eligibility'
import ExportSummary from '@/pages/dashboard/ExportSummary'
import OfferLetter from '@/pages/dashboard/OfferLetter'
import ProfileSettings from '@/pages/dashboard/ProfileSettings'

/**
 * AppInner must live inside <BrowserRouter> so it can call useLocation().
 * It suppresses the marketing Navbar/Footer when the user is inside /dashboard.
 */
function AppInner() {
  const location = useLocation()
  const inPortal = location.pathname.startsWith('/dashboard')

  return (
    <>
      {!inPortal && <Navbar />}

      <main style={inPortal ? undefined : { paddingTop: 'var(--navbar-height)' }}>
        <Routes>
          {/* ── Public marketing routes ─────────────────── */}
          <Route path="/"                element={<Home />} />
          <Route path="/sme-finance"     element={<SmeFinance />} />
          <Route path="/project-funding" element={<ProjectFunding />} />
          <Route path="/how-it-works"    element={<HowItWorksPage />} />
          <Route path="/about"           element={<About />} />
          <Route path="/team"            element={<Team />} />
          <Route path="/insights"        element={<Insights />} />
          <Route path="/contact"         element={<Contact />} />

          {/* ── Auth routes ─────────────────────────────── */}
          <Route path="/login"           element={<Login />} />
          <Route path="/signup"          element={<Signup />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/signup/profile"  element={
            <ProtectedRoute><SignupProfile /></ProtectedRoute>
          } />

          {/* ── Admin routes ────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="staff"><Admin /></ProtectedRoute>
          } />
          <Route path="/admin/applications/:id" element={
            <ProtectedRoute requiredRole="staff"><ApplicationWorkspace /></ProtectedRoute>
          } />

          {/* ── Borrower dashboard (nested routes) ─────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="borrower"><DashboardLayout /></ProtectedRoute>
          }>
            <Route index                    element={<Overview />} />
            <Route path="start"             element={<StartApplication />} />
            <Route path="application"       element={<MyApplication />} />
            <Route path="modelling"         element={<Modelling />} />
            <Route path="documents"         element={<DocumentsPage />} />
            <Route path="checklist"         element={<DocChecklist />} />
            <Route path="messages"          element={<MessagesPage />} />
            <Route path="fees"              element={<FeesPage />} />
            <Route path="eligibility"       element={<Eligibility />} />
            <Route path="export"            element={<ExportSummary />} />
            <Route path="offer-letter"      element={<OfferLetter />} />
            <Route path="profile"           element={<ProfileSettings />} />
          </Route>
        </Routes>
      </main>

      {!inPortal && <Footer />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  )
}
