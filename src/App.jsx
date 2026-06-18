import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Home from '@/pages/Home'
import SmeFinance from '@/pages/SmeFinance'
import ProjectFunding from '@/pages/ProjectFunding'
import HowItWorksPage from '@/pages/HowItWorks'
import About from '@/pages/About'
import Team from '@/pages/Team'
import Insights from '@/pages/Insights'
import Contact from '@/pages/Contact'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import VerifyEmail from '@/pages/auth/VerifyEmail'
import SignupProfile from '@/pages/auth/SignupProfile'
import Dashboard from '@/pages/Dashboard'
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main style={{ paddingTop: 'var(--navbar-height)' }}>
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/sme-finance"     element={<SmeFinance />} />
            <Route path="/project-funding" element={<ProjectFunding />} />
            <Route path="/how-it-works"    element={<HowItWorksPage />} />
            <Route path="/about"           element={<About />} />
            <Route path="/team"            element={<Team />} />
            <Route path="/insights"        element={<Insights />} />
            <Route path="/contact"         element={<Contact />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<Signup />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/signup/profile"  element={
              <ProtectedRoute><SignupProfile /></ProtectedRoute>
            } />
            <Route path="/dashboard"       element={
              <ProtectedRoute requiredRole="borrower"><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin"           element={
              <ProtectedRoute requiredRole="staff"><Admin /></ProtectedRoute>
            } />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}
