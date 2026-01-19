export interface LogEntry {
  id: number
  timestamp: string
  raw: string
  parsed?: ParsedLog
}

export interface ParsedLog {
  time?: string
  level?: string
  message?: string
  source?: string
  fields?: Record<string, unknown>
}

export interface LogFilter {
  search?: string
  levels?: string[]
  regex?: boolean
  afterId?: number
  limit?: number
}

export interface LogResponse {
  logs: LogEntry[]
  total: number
  hasMore: boolean
}

export interface StatusResponse {
  bufferSize: number
  bufferUsed: number
  totalReceived: number
  uptime: string
  stdinOpen: boolean
}

const BASE_URL = ''

export async function fetchLogs(filter: LogFilter = {}): Promise<LogResponse> {
  const params = new URLSearchParams()

  if (filter.search) params.set('search', filter.search)
  if (filter.levels?.length) params.set('levels', filter.levels.join(','))
  if (filter.regex) params.set('regex', 'true')
  if (filter.afterId) params.set('afterId', String(filter.afterId))
  if (filter.limit) params.set('limit', String(filter.limit))

  const res = await fetch(`${BASE_URL}/api/logs?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`)
  return res.json()
}

export async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch(`${BASE_URL}/api/status`)
  if (!res.ok) throw new Error(`Failed to fetch status: ${res.statusText}`)
  return res.json()
}

export async function clearLogs(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/logs`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to clear logs: ${res.statusText}`)
}
