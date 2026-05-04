import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Download, ChevronLeft, ChevronRight, Package, Loader2, Maximize, Play } from 'lucide-react'
import { FileDoc, api, loadThumbnail } from '../lib/api'
import { fmtBytes } from '../lib/utils'

interface Props {
  file: FileDoc
  files: FileDoc[]   // all files in current view (for prev/next)
  onClose: () => void
  onDownload: (file: FileDoc) => void
}

export function Lightbox({ file: initial, files, onClose, onDownload }: Props) {
  const [current, setCurrent] = useState(initial)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [fullLoaded, setFullLoaded] = useState(false)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [loadingHighRes, setLoadingHighRes] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // index among image/video files only
  const mediaFiles = files.filter(f => f.type === 'image' || f.type === 'video')
  const idx = mediaFiles.findIndex(f => f.message_id === current.message_id)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  const go = useCallback((delta: number) => {
    const next = mediaFiles[idx + delta]
    if (next) {
      setCurrent(next)
    }
  }, [idx, mediaFiles])

  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset state on change
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setFullUrl(null)
    setFullLoaded(false)
    setThumbLoaded(false)
    setThumbUrl(null)
    setLoadingHighRes(false)
    
    // Load the optimized thumbnail
    if (current.thumb_msg_id) {
      loadThumbnail(current.message_id, current.channel_id).then(url => {
        setThumbUrl(url)
      }).catch(console.error)
    }
  }, [current.message_id, current.channel_id])

  useEffect(() => {
    const video = videoRef.current
    return () => {
      if (video) {
        video.removeAttribute('src')
        video.load()
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (fullUrl && fullUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fullUrl)
      }
    }
  }, [fullUrl])

  const handleLoadHighRes = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingHighRes(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const url = api.files.downloadUrl(current.message_id, current.channel_id) + '&inline=true'

    if (current.type === 'video') {
      setFullUrl(url)
      setFullLoaded(true)
      setLoadingHighRes(false)
      return
    }

    try {
      const r = await fetch(url, { signal: controller.signal })
      const blob = await r.blob()
      const objectUrl = URL.createObjectURL(blob)
      setFullUrl(objectUrl)
      setFullLoaded(true)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      console.error("Failed to load high res", e)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
        setLoadingHighRes(false)
      }
    }
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fullUrl && fullUrl.startsWith('blob:')) {
      const a = document.createElement('a')
      a.href = fullUrl
      a.download = current.name
      a.click()
    } else {
      onDownload(current)
    }
  }

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go, onClose])

  const displayUrl = fullLoaded ? fullUrl : thumbUrl

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-in 0.12s ease',
      }}
    >
      {/* Main image area */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '88vh' }}
      >
        {/* Loading quality indicator */}
        {loadingHighRes && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 2,
            background: 'rgba(0,0,0,0.6)', borderRadius: 4,
            padding: '4px 8px', display: 'flex', alignItems: 'center'
          }}>
            <Loader2 size={14} color="white" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Load High Res Button */}
        {!fullLoaded && !loadingHighRes && thumbLoaded && (
          <button
            onClick={handleLoadHighRes}
            style={current.type === "image" ? {
              position: 'absolute', bottom: 8, right: 8, zIndex: 2,
              background: 'rgba(0,0,0,0.6)', borderRadius: 4,
              padding: '4px 8px', fontSize: 11, color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 4,
              // border: '1px solid var(--border)'
            } : {
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2,
              background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
              padding: isMobile ? '8px' : '16px', color: 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            {current.type === "image" ? (
              <>
                <Maximize size={12} />
                Load HD
              </>
            ) : (
              <Play size={isMobile ? 16 : 24} fill="currentColor" />
            )}
          </button>
        )}

        {current.type === 'video' && fullLoaded ? (
          <video
            ref={videoRef}
            src={fullUrl!}
            controls
            autoPlay
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              objectFit: 'contain', display: 'block',
              borderRadius: 'var(--radius)',
            }}
          />
        ) : displayUrl && (
          <img
            src={displayUrl}
            alt={current.name}
            onLoad={() => {
              if (!thumbLoaded) setThumbLoaded(true)
            }}
            style={{
              maxWidth: '90vw', maxHeight: '80vh',
              objectFit: 'contain', display: 'block',
              borderRadius: 'var(--radius)',
              filter: fullLoaded ? 'none' : 'blur(0.5px)',
              transition: 'filter 0.3s ease',
            }}
          />
        )}

        {/* Hidden full-res loader */}
        {/* {fullUrl && !fullUrl.startsWith('blob:') && !fullLoaded && thumbLoaded && current.type === 'image' && (
          <img
            src={fullUrl}
            alt=""
            onLoad={() => setFullLoaded(true)}
            style={{ display: 'none' }}
          />
        )} */}
      </div>

      {/* Controls */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: isMobile ? 8 : 16, right: isMobile ? 8 : 16,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: isMobile ? '4px 6px' : '6px 10px',
          color: 'var(--text-2)', zIndex: 10
        }}
      >
        <X size={isMobile ? 14 : 16} />
      </button>

      <button
        onClick={handleDownloadClick}
        style={{
          position: 'fixed', top: isMobile ? 8 : 16, right: isMobile ? 48 : 60,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: isMobile ? '4px 6px' : '6px 10px',
          color: 'var(--text-2)', zIndex: 10
        }}
      >
        <Download size={isMobile ? 14 : 16} />
      </button>

      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); go(-1) }}
          style={{
            position: 'fixed', left: isMobile ? 4 : 16, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: isMobile ? '6px 4px' : '10px 8px', color: 'var(--text-2)',
            zIndex: 10
          }}
        >
          <ChevronLeft size={isMobile ? 14 : 18} />
        </button>
      )}
      {idx < mediaFiles.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); go(1) }}
          style={{
            position: 'fixed', right: isMobile ? 4 : 16, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: isMobile ? '6px 4px' : '10px 8px', color: 'var(--text-2)',
            zIndex: 10
          }}
        >
          <ChevronRight size={isMobile ? 14 : 18} />
        </button>
      )}

      {/* File info bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '24px 20px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontWeight: 500, flex: 1 }} className="truncate">
          {current.name}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
          {current.resolution !== '-' && <>{current.resolution} · </>}
          {fmtBytes(current.size)}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
          {idx + 1} / {mediaFiles.length}
        </span>
      </div>
    </div>
  )
}
