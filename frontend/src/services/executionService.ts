export type Language = 'javascript' | 'python' | 'cpp' | 'rust'

export type RunRequest = {
  language: Language
  source: string
  input: string
  filename: string
}

export type RunResult = {
  stdout: string
  stderr: string
  status: 'success' | 'error' | 'unavailable'
  durationMs?: number
}

const endpoint = import.meta.env.VITE_EXECUTION_API_URL as string | undefined

export async function executeCode(request: RunRequest): Promise<RunResult> {
  if (!endpoint) {
    return {
      stdout: '',
      stderr: 'Execution backend is not configured. Set VITE_EXECUTION_API_URL to connect a runner.',
      status: 'unavailable',
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Runner request failed (${response.status})`)
  }
  return {
    stdout: data.stdout ?? data.output ?? '',
    stderr: data.stderr ?? data.error ?? '',
    status: data.status === 'error' || data.stderr ? 'error' : 'success',
    durationMs: data.durationMs ?? data.duration_ms,
  }
}
