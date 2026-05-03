import { useState, useRef, useEffect } from 'react'
import { FileDoc, api, loadThumbnail } from '../lib/api'
import { ImageIcon, FileVideo, FileAudio, File, Package, PlayCircleIcon } from 'lucide-react'

interface Props {
  file: FileDoc
  size?: number
}

const typeIcon = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  document: File,
}

export function Thumbnail({ file, size = 160 }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [fullLoaded, setFullLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasThumbnail = !!file.thumb_msg_id

  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!hasThumbnail) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('loading')
          loadThumbnail(file.message_id, file.channel_id)
            .then(url => {
              setThumbUrl(url)
            })
            .catch(() => setState('error'))
          obs.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [hasThumbnail, file.message_id, file.channel_id])

  const Icon = typeIcon[file.type] ?? File

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        position: 'relative',
        background: 'var(--bg-2)',
        // borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Fallback icon */}
      {(!hasThumbnail || state === 'error') && (
        <Icon size={size * 0.28} color="var(--text-3)" strokeWidth={1} />
      )}

      {/* Skeleton while loading */}
      {state === 'loading' && !fullLoaded && (
        <div
          className="skeleton"
          style={{ position: 'absolute', inset: 0 }}
        />
      )}

      {/* Thumbnail image */}
      {thumbUrl && state !== 'idle' && state !== 'error' && (
        <img
          src={thumbUrl}
          alt=""
          onLoad={() => { setState('loaded'); setFullLoaded(true) }}
          onError={() => setState('error')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: fullLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Split badge */}
      {file.is_split && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: 'rgba(0,0,0,0.75)',
          borderRadius: 4, padding: '2px 5px',
          fontSize: 10, display: 'flex', alignItems: 'center', gap: 3,
          color: 'var(--warn)',
        }}>
          <Package size={10} />
          {file.total_parts}
        </div>
      )}

      {/* Type badge for non-images */}
      {file.type !== 'image' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.1)',
          color: 'rgba(255,255,255,0.9)',
        }}>
          <PlayCircleIcon size={Math.min(48, size * 0.5)} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}
