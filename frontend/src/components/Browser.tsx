import { useState, useEffect } from 'react'
import {
  Grid, List, FolderOpen, Layers, Image, FileVideo,
  FileAudio, File, Download, X, ChevronRight, RefreshCw,
  Share2, Folder, MoveRight, Menu, Plus
} from 'lucide-react'
import { api, FileDoc, MediaType } from '../lib/api'
import { useStore } from '../lib/store'
import { childFolders, parentPath } from '../lib/utils'
import { FileGrid } from './FileGrid'
import { Lightbox } from './Lightbox'
import { DownloadManager } from './DownloadManager'
import { ShareModal } from './ShareModal'

export function Browser() {
  const {
    channel, folderPath, setFolderPath,
    browseMode, setBrowseMode,
    viewMode, setViewMode,
    typeFilter, setTypeFilter,
    selected, clearSelection, selectAll,
    sidebarOpen, setSidebarOpen
  } = useStore()

  const [files, setFiles] = useState<FileDoc[]>([])
  const [allFolders, setAllFolders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Lightbox
  const [lightboxFile, setLightboxFile] = useState<FileDoc | null>(null)
  // Download manager
  const [dlFiles, setDlFiles] = useState<FileDoc[] | null>(null)
  // Share modal
  const [shareOpen, setShareOpen] = useState(false)
  // Move modal
  const [moveOpen, setMoveOpen] = useState(false)
  // Refresh trigger
  const [refresh, setRefresh] = useState(0)

  const channelId = channel?.channel_id

  useEffect(() => {
    if (!channelId) return
    api.files.folders(channelId).then(r => setAllFolders(r.folders))
  }, [channelId, refresh])

  // Load files
  useEffect(() => {
    if (!channelId) return
    setFiles([])
    setLoading(true)
    const params: Parameters<typeof api.files.list>[0] = {
      channel_id: channelId,
      limit: 500,
    }
    if (browseMode === 'folder') {
      params.path = folderPath
    } else {
      params.recursive = true
      if (folderPath) params.path = folderPath
      if (typeFilter) params.type = typeFilter
    }
    api.files.list(params)
      .then(r => { setFiles(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [channelId, folderPath, browseMode, typeFilter, refresh])

  if (!channel) return null

  const childFolderNames = childFolders(allFolders, folderPath)
  const selectedFiles = files.filter(f => selected.has(f.message_id))

  const handleOpen = (file: FileDoc) => {
    if (file.type === 'image' || file.type === 'video') setLightboxFile(file)
  }

  const handleDownloadSelected = () => {
    if (selectedFiles.length > 0) setDlFiles(selectedFiles)
  }

  const handleDownloadSingle = (file: FileDoc) => setDlFiles([file])

  const handleMoveFiles = async (newPath: string) => {
    if (!channelId || selectedFiles.length === 0) return
    const msgIds = selectedFiles.map(f => f.message_id)
    await api.files.move(msgIds, channelId, newPath)
    setMoveOpen(false)
    clearSelection()
    setRefresh(r => r + 1)
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--bg)',
    }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        background: 'var(--bg-1)'
      }}>
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-2)', height: "16px" }}>
            <Menu size={16} />
          </button>
        )}
        {/* Breadcrumb */}
        <BreadCrumb path={folderPath} onNavigate={setFolderPath} />

        <div style={{ flex: 1 }} />

        {/* Mode toggle: folder / type */}
        <ModeToggle
          value={browseMode}
          onChange={(m) => { setBrowseMode(m as any); setTypeFilter('') }}
          options={[
            { value: 'folder', icon: <FolderOpen size={13} />, label: 'Folders' },
            { value: 'type', icon: <Layers size={13} />, label: 'By type' },
          ]}
        />

        {/* Type filter (only in type mode) */}
        {browseMode === 'type' && (
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
        )}

        {/* View toggle: grid / list */}
        <ModeToggle
          value={viewMode}
          onChange={setViewMode as any}
          options={[
            { value: 'grid', icon: <Grid size={13} />, label: '' },
            { value: 'list', icon: <List size={13} />, label: '' },
          ]}
        />

        {/* Share */}
        {/* <ToolBtn onClick={() => setShareOpen(true)} title="Share this folder">
          <Share2 size={13} /> Share
        </ToolBtn> */}

        {/* Sync */}
        {/* <ToolBtn
          onClick={() => api.sync.start(channel.channel_id)}
          title="Sync DB from Telegram"
        >
          <RefreshCw size={13} />
        </ToolBtn> */}
      </div>

      {/* ── Selection bar ─────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div style={{
          background: 'var(--accent-dim)', borderBottom: '1px solid var(--accent)',
          padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
            {selected.size} selected
          </span>
          <button onClick={() => selectAll(files.map(f => f.message_id))}
            style={{ color: 'var(--text-2)', fontSize: 12 }}>
            Select all {total}
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setMoveOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--bg-3)', color: 'var(--text)',
              borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: 12,
            }}
          >
            <MoveRight size={12} /> Move
          </button>
          <button
            onClick={handleDownloadSelected}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--accent)', color: '#fff',
              borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: 12,
            }}
          >
            <Download size={12} /> Download
          </button>
          <button onClick={clearSelection} style={{ color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Folder sidebar — only in folder mode */}
        {browseMode === 'folder' && childFolderNames.length > 0 && (
          <div style={{
            width: 'clamp(120px, 30vw, 200px)', borderRight: '1px solid var(--border)',
            overflowY: 'auto', padding: '8px 0', flexShrink: 0,
          }}>
            {folderPath && (
              <button
                onClick={() => setFolderPath(parentPath(folderPath))}
                style={{
                  width: '100%', padding: '6px 12px',
                  textAlign: 'left', fontSize: 12,
                  color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                ← Back
              </button>
            )}
            {childFolderNames.map(name => {
              const fullPath = folderPath ? `${folderPath}/${name}` : name
              return (
                <button
                  key={name}
                  onClick={() => setFolderPath(fullPath)}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                  onDrop={e => {
                    e.preventDefault()
                    const data = e.dataTransfer.getData('teledrive/msg-ids')
                    if (data) {
                      const msgIds = data.split(',').map(Number)
                      if (!channelId) return
                      api.files.move(msgIds, channelId, fullPath).then(() => {
                        clearSelection()
                        setRefresh(r => r + 1)
                      })
                    }
                  }}
                  style={{
                    width: '100%', padding: '6px 12px',
                    textAlign: 'left', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 7,
                    color: 'var(--text-2)',
                    borderRadius: 0,
                  }}
                >
                  <Folder size={13} color="var(--text-3)" />
                  <span className="truncate">{name}</span>
                </button>
              )
            })}

            <button
              onClick={() => {
                const name = prompt("New folder name")
                if (name) {
                  const newPath = folderPath ? `${folderPath}/${name}` : name
                  setAllFolders([...allFolders, newPath])
                  setFolderPath(newPath)
                }
              }}
              style={{
                width: '100%', padding: '6px 12px', marginTop: 10,
                textAlign: 'left', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 7,
                color: 'var(--text-3)',
                borderRadius: 0,
              }}
            >
              <Plus size={13} />
              <span className="truncate">New Folder</span>
            </button>
          </div>
        )}

        {/* Files area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <EmptyState kind="loading" />
          ) : files.length === 0 ? (
            <EmptyState kind="empty" />
          ) : (
            <FileGrid files={files} onOpen={handleOpen} />
          )}
        </div>
      </div>

      {/* ── Overlays ───────────────────────────────────────────────── */}
      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          files={files}
          onClose={() => setLightboxFile(null)}
          onDownload={handleDownloadSingle}
        />
      )}
      {dlFiles && (
        <DownloadManager files={dlFiles} onClose={() => { setDlFiles(null); clearSelection() }} />
      )}
      {shareOpen && (
        <ShareModal
          channel={channel}
          path={folderPath || undefined}
          onClose={() => setShareOpen(false)}
        />
      )}
      {moveOpen && (
        <MoveModal
          folders={allFolders}
          onClose={() => setMoveOpen(false)}
          onMove={handleMoveFiles}
        />
      )}
    </div>
  )
}

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function BreadCrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const parts = path ? path.split('/') : []
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
      <button
        onClick={() => onNavigate('')}
        style={{ color: path ? 'var(--text-2)' : 'var(--text)', fontWeight: path ? 400 : 500 }}
      >
        Root
      </button>
      {parts.map((part, i) => {
        const p = parts.slice(0, i + 1).join('/')
        const isLast = i === parts.length - 1
        return (
          <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronRight size={12} color="var(--text-3)" />
            <button
              onClick={() => onNavigate(p)}
              style={{ color: isLast ? 'var(--text)' : 'var(--text-2)', fontWeight: isLast ? 500 : 400 }}
            >
              {part}
            </button>
          </span>
        )
      })}
    </div>
  )
}

function ModeToggle({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; icon: React.ReactNode; label: string }[]
}) {
  return (
    <div style={{
      display: 'flex', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 10px', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 5,
            background: value === opt.value ? 'var(--bg-3)' : 'transparent',
            color: value === opt.value ? 'var(--text)' : 'var(--text-3)',
          }}
        >
          {opt.icon}{opt.label}
        </button>
      ))}
    </div>
  )
}

function TypeFilter({ value, onChange }: { value: MediaType | ''; onChange: (v: MediaType | '') => void }) {
  const types: { v: MediaType | ''; icon: any; label: string }[] = [
    { v: '', icon: Layers, label: 'All' },
    { v: 'image', icon: Image, label: 'Images' },
    { v: 'video', icon: FileVideo, label: 'Videos' },
    // { v: 'audio', icon: FileAudio, label: 'Audio' },
    // { v: 'document', icon: File, label: 'Docs' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {types.map(t => (
        <button
          key={t.v}
          onClick={() => onChange(t.v)}
          style={{
            padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: value === t.v ? 'var(--bg-3)' : 'transparent',
            color: value === t.v ? 'var(--text)' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <t.icon size={11} /> {t.label}
        </button>
      ))}
    </div>
  )
}

function ToolBtn({ children, onClick, title }: {
  children: React.ReactNode; onClick: () => void; title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '5px 10px', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 5,
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        color: 'var(--text-2)',
      }}
    >
      {children}
    </button>
  )
}

function MoveModal({ folders, onClose, onMove }: { folders: string[], onClose: () => void, onMove: (p: string) => void }) {
  const [path, setPath] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: 'var(--bg-1)', padding: 20, borderRadius: 'var(--radius)', width: 400, maxWidth: '90vw', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Move Files</h3>
        <input
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="New folder path (e.g. Pictures/Vacation)"
          style={{ width: '100%', padding: '8px 12px', marginBottom: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius)' }}
          autoFocus
        />
        <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          {folders.filter(f => f.toLowerCase().includes(path.toLowerCase())).map(f => (
            <div key={f} onClick={() => setPath(f)} style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
              {f || 'Root'}
            </div>
          ))}
          {folders.length === 0 && <div style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-3)' }}>No folders exist yet.</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-2)' }}>Cancel</button>
          <button onClick={() => onMove(path)} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)' }}>Move</button>
        </div>
      </div>
    </div>
  )
}

/* ── Empty / loading states ───────────────────────────────────────────────── */

function EmptyState({ kind }: { kind: 'loading' | 'empty' }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      color: 'var(--text-3)',
      padding: 40,
      userSelect: 'none',
    }}>
      {kind === 'loading' ? <LoadingIllustration /> : <EmptyIllustration />}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>
          {kind === 'loading' ? 'Loading your files…' : 'Nothing here yet'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {kind === 'loading'
            ? 'Fetching from Drive, hang tight'
            : 'Upload files to this channel to see them here'}
        </div>
      </div>
    </div>
  )
}

/** Animated shimmer grid — conveys "loading thumbnails" */
function LoadingIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--bg-2)" />
          <stop offset="50%" stopColor="var(--bg-3)" />
          <stop offset="100%" stopColor="var(--bg-2)" />
          <animateTransform
            attributeName="gradientTransform" type="translate"
            from="-1 0" to="2 0" dur="1.4s" repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <rect
            key={i}
            x={col * 48 + 2} y={row * 48 + 2}
            width={42} height={42} rx={3}
            fill="url(#shimG)"
            opacity={0.6 + (i % 3) * 0.13}
          />
        )
      })}
    </svg>
  )
}

/** Cloud + photo illustration — conveys "empty folder" */
function EmptyIllustration() {
  return (
    <svg width="120" height="110" viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cloud body */}
      <path
        d="M90 55c0-11-9-20-20-20-2 0-4 .3-5.8.9C62 28.5 54.5 22 45.5 22 33.6 22 24 31.6 24 43.5c0 .5 0 1 .1 1.5C16.6 47 11 53.5 11 61.5 11 70.6 18.4 78 27.5 78h58C94.6 78 102 70.6 102 61.5c0-3.7-1.2-7.1-3.3-9.8A19.9 19.9 0 0 0 90 55Z"
        fill="var(--bg-2)" stroke="var(--border-bright)" strokeWidth="1.5"
      />
      {/* Photo frame */}
      <rect x="38" y="38" width="44" height="34" rx="3"
        fill="var(--bg-3)" stroke="var(--border-bright)" strokeWidth="1.2" />
      {/* Mountains */}
      <path d="M44 66l10-14 8 10 6-7 10 11H44Z"
        fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Sun */}
      <circle cx="72" cy="46" r="4" fill="var(--warn)" opacity="0.7" />
      {/* Pulsing down-arrow */}
      <path d="M60 84v12M55 91l5 5 5-5"
        stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}
