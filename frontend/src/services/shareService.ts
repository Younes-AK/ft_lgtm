import type { Language } from './executionService'

export type ShareResult = {
  success: boolean
  share_id: string
  cid: string
  share_url: string
}

export type SharedCode = {
  success: boolean
  title: string
  language: Language
  cid: string
  code: string
}

const endpoint = import.meta.env.VITE_SHARE_API_URL || '/api/share'

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.detail || `Share request failed (${response.status})`)
  }
  return data as T
}

export async function shareCode(request: { code: string; language: Language; title: string }): Promise<ShareResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return readResponse<ShareResult>(response)
}

export async function retrieveSharedCode(identifier: string): Promise<SharedCode> {
  const shareId = getShareId(identifier)
  if (!shareId) throw new Error('Enter a share link or share ID.')

  const response = await fetch(`${endpoint}/${encodeURIComponent(shareId)}`)
  return readResponse<SharedCode>(response)
}

export function getShareId(identifier: string): string {
  const value = identifier.trim()
  if (!value) return ''

  try {
    const url = new URL(value, window.location.origin)
    const match = url.pathname.match(/\/share\/([^/]+)\/?$/)
    return decodeURIComponent(match?.[1] ?? value.replace(/^\/+|\/+$/g, ''))
  } catch {
    return value.replace(/^\/+|\/+$/g, '')
  }
}
