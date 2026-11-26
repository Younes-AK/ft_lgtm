export type Language = 'python' | 'rust'

export type RunRequest = {
  language: Language
  source: string
}

export type RunResult = {
  stdout: string
  stderr: string
  status: 'success' | 'error' | 'unavailable'
  durationMs?: number
}

const endpoint = import.meta.env.VITE_EXECUTION_API_URL || '/api/run'

export async function executeCode(request: RunRequest): Promise<RunResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: request.language, code: request.source }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Runner request failed (${response.status})`)
  }
  return {
    stdout: data.stdout ?? data.output ?? '',
    stderr: data.stderr ?? data.error ?? '',
    status: data.success === false || data.status === 'error' ? 'error' : 'success',
    durationMs: data.durationMs ?? data.duration_ms,
  }
}
