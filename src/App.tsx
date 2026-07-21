import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import CockpitPage from './pages/CockpitPage'
import FinancePage from './pages/FinancePage'
import FinanceImportPage from './pages/FinanceImportPage'
import SalesPage from './pages/SalesPage'
import ProjectsPage from './pages/ProjectsPage'
import SettingsPage from './pages/SettingsPage'
import NavIcon from './components/NavIcon'
import UpdateBanner from './components/UpdateBanner'
import { PwaUpdateProvider } from './lib/pwaUpdate'
import { seedDemoDataIfNeeded } from './db/db'
import './App.css'

function App() {
  useEffect(() => {
    seedDemoDataIfNeeded()
  }, [])

  return (
    <PwaUpdateProvider>
      <div className="app">
        <main className="app-content">
          <UpdateBanner />
          <div className="app-content-scroll">
            <Routes>
              <Route path="/" element={<CockpitPage />} />
              <Route path="/finanzen" element={<FinancePage />} />
              <Route path="/finanzen/import" element={<FinanceImportPage />} />
              <Route path="/vertrieb" element={<SalesPage />} />
              <Route path="/projekte" element={<ProjectsPage />} />
              <Route path="/einstellungen" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name="cockpit" />
            Cockpit
          </NavLink>
          <NavLink to="/finanzen" className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name="finance" />
            Finanzen
          </NavLink>
          <NavLink to="/vertrieb" className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name="sales" />
            Vertrieb
          </NavLink>
          <NavLink to="/projekte" className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name="projects" />
            Projekte
          </NavLink>
          <NavLink to="/einstellungen" className={({ isActive }) => (isActive ? 'active' : '')}>
            <NavIcon name="settings" />
            Einstellungen
          </NavLink>
        </nav>
      </div>
    </PwaUpdateProvider>
  )
}

export default App
