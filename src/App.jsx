import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Home from '@/pages/Home'
import SmeFinance from '@/pages/SmeFinance'
import ProjectFunding from '@/pages/ProjectFunding'
import HowItWorksPage from '@/pages/HowItWorks'
import About from '@/pages/About'
import Team from '@/pages/Team'
import Insights from '@/pages/Insights'
import Contact from '@/pages/Contact'

export default function App() {
  return (
    <BrowserRouter>
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
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
