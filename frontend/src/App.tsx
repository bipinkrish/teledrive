import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Browser } from './components/Browser'
import { ShareView } from './components/ShareView'
import { useStore } from './lib/store'

import { useEffect, useState } from 'react'
import { api } from './lib/api'

const APP_PWD = import.meta.env.VITE_APP_PASSWORD

function App() {
  const { channel, setChannel, sidebarOpen } = useStore()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const [auth, setAuth] = useState(() => {
    if (!APP_PWD) return true
    return sessionStorage.getItem('teledrive_auth') === APP_PWD
  })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!auth) return
    api.channels.list().then(r => {
      if (r.channels.length > 0 && !useStore.getState().channel) {
        setChannel(r.channels[0])
      }
    })
  }, [setChannel, auth])

  if (!auth) {
    return (
      <div style={{ 
        height: '100%', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' 
      }}>
        <h2 style={{ marginBottom: 16 }}>TeleDrive</h2>
        <form onSubmit={e => {
          e.preventDefault();
          const pwd = new FormData(e.currentTarget).get('password')
          if (pwd === APP_PWD) {
            sessionStorage.setItem('teledrive_auth', APP_PWD)
            setAuth(true)
          } else {
            alert('Incorrect Password')
          }
        }} style={{ display: 'flex', gap: 8 }}>
          <input 
            name="password" type="password" placeholder="Password" required autoFocus
            style={{ 
              padding: '8px 12px', borderRadius: 'var(--radius)', 
              border: '1px solid var(--border)', background: 'var(--bg-1)',
              color: 'var(--text)'
            }} 
          />
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: 'var(--radius)', 
            background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer'
          }}>Login</button>
        </form>
      </div>
    )
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public share links — no sidebar */}
        <Route path="/s/:token" element={<ShareView />} />

        {/* Main authenticated view */}
        <Route
          path="/*"
          element={
            <div style={{ height: '100%', display: 'flex' }}>
              {sidebarOpen && <Sidebar />}
              {/* On mobile, hide everything behind sidebar when it's open */}
              {(!isMobile || !sidebarOpen) && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {channel ? (
                    <Browser />
                  ) : (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'var(--text-3)', fontSize: 14,
                    }}>
                      Select an album to browse
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
