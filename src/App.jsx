import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ paddingTop: '72px' }}>
        <Routes>
          <Route path="/"                element={<div />} />
          <Route path="/sme-finance"     element={<div />} />
          <Route path="/project-funding" element={<div />} />
          <Route path="/how-it-works"    element={<div />} />
          <Route path="/about"           element={<div />} />
          <Route path="/team"            element={<div />} />
          <Route path="/insights"        element={<div />} />
          <Route path="/contact"         element={<div />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
