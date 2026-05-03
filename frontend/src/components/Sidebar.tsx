import { useEffect, useState } from 'react'
import { HardDrive, Plus, X, Trash2 } from 'lucide-react'
import { api, Channel } from '../lib/api'
import { useStore } from '../lib/store'
import { cacheClear, cacheSize } from '../lib/thumbCache'

export function Sidebar() {
  const { channel, setChannel } = useStore()
  const [channels, setChannels] = useState<Channel[]>([])
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [thumbCount, setThumbCount] = useState(0)

  useEffect(() => {
    cacheSize().then(setThumbCount)
  }, [])

  useEffect(() => {
    api.channels.list().then(r => {
      setChannels(r.channels)
    })
  }, [setChannel])

  async function createChannel() {
    if (!newTitle.trim()) return
    await api.channels.create(newTitle.trim())
    const r = await api.channels.list()
    setChannels(r.channels)
    setAdding(false)
    setNewTitle('')
  }

  return (
    <div style={{
      width: 200, background: 'var(--bg-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '11px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <HardDrive size={16} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', flex: 1 }}>
          TeleDrive
        </span>
        <button onClick={() => useStore.getState().setSidebarOpen(false)} style={{ color: 'var(--text-3)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Channels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <div style={{
          padding: '6px 12px 3px',
          fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-3)',
        }}>
          Albums
        </div>

        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => {
              setChannel(ch)
              if (window.innerWidth <= 768) useStore.getState().setSidebarOpen(false)
            }}
            style={{
              width: '100%', textAlign: 'left',
              padding: '7px 12px', fontSize: 13,
              background: channel?.channel_id === ch.channel_id
                ? 'var(--bg-3)' : 'transparent',
              color: channel?.channel_id === ch.channel_id
                ? 'var(--text)' : 'var(--text-2)',
              borderRadius: 0, display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
              opacity: channel?.channel_id === ch.channel_id ? 1 : 0.3,
            }} />
            <span className="truncate">{ch.title}</span>
          </button>
        ))}
      </div>

      {/* Add channel */}
      {/* <div style={{
        padding: '8px', borderTop: '1px solid var(--border)',
      }}>
        {adding ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createChannel()
                if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
              }}
              placeholder="Channel name"
              style={{
                flex: 1, padding: '5px 7px', fontSize: 12,
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text)',
              }}
            />
            <button onClick={() => { setAdding(false); setNewTitle('') }}
              style={{ color: 'var(--text-3)' }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              width: '100%', padding: '6px',
              fontSize: 12, color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
            }}
          >
            <Plus size={12} /> New channel
          </button>
        )}
      </div> */}
      {/* Cache info footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
      }}>
        <span>{thumbCount} thumbs cached</span>
        <button
          onClick={async () => {
            await cacheClear()
            setThumbCount(0)
          }}
          title="Clear thumbnail cache"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--text-3)', fontSize: 11,
            padding: '3px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
          }}
        >
          <Trash2 size={10} /> Clear
        </button>
      </div>
    </div>
  )
}
