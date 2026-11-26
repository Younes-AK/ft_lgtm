import { useState } from 'react'
import { Check, Copy, Link2, UploadCloud, X } from 'lucide-react'
import type { Language } from '../services/executionService'
import { retrieveSharedCode, shareCode } from '../services/shareService'
import './ShareDialog.css'

type ShareDialogProps = {
  code: string
  language: Language
  onClose: () => void
  onLoad: (code: string, language: Language) => void
}

export default function ShareDialog({ code, language, onClose, onLoad }: ShareDialogProps) {
  const [title, setTitle] = useState('Untitled')
  const [identifier, setIdentifier] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const createShare = async () => {
    setBusy(true)
    setError('')
    setShareUrl('')
    try {
      const result = await shareCode({ code, language, title: title.trim() || 'Untitled' })
      setShareUrl(`${window.location.origin}/share/${encodeURIComponent(result.share_id)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not share this code.')
    } finally {
      setBusy(false)
    }
  }

  const loadShare = async () => {
    setBusy(true)
    setError('')
    try {
      const shared = await retrieveSharedCode(identifier)
      onLoad(shared.code, shared.language)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not retrieve shared code.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the link. Select and copy it instead.')
    }
  }

  return (
    <div className="share-backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header className="share-dialog-header">
          <div>
            <h2 id="share-title">Share code</h2>
            <p>Save this code to IPFS or open a code someone shared with you.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close share dialog"><X size={18} /></button>
        </header>

        <div className="share-section">
          <h3><UploadCloud size={16} /> Share the current editor</h3>
          <label className="share-label" htmlFor="share-name">Title</label>
          <input id="share-name" value={title} maxLength={100} onChange={event => setTitle(event.target.value)} />
          <button className="share-primary" onClick={() => void createShare()} disabled={busy || !code.trim()}>
            {busy ? 'Working…' : 'Create share link'}
          </button>
          {shareUrl && <div className="share-link-row">
            <input aria-label="Share link" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} />
            <button className="share-secondary copy-button" onClick={() => void copyLink()} aria-label="Copy share link">
              {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}
            </button>
          </div>}
        </div>

        <div className="share-divider"><span>OR</span></div>

        <div className="share-section">
          <h3><Link2 size={16} /> Retrieve shared code</h3>
          <label className="share-label" htmlFor="share-identifier">Share link or ID</label>
          <div className="share-link-row">
            <input id="share-identifier" value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Paste a share link or ID" />
            <button className="share-secondary" onClick={() => void loadShare()} disabled={busy || !identifier.trim()}>
              {busy ? 'Loading…' : 'Load'}
            </button>
          </div>
        </div>
        {error && <p className="share-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}
