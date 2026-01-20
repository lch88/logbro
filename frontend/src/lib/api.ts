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
  sources?: string[]
  regex?: boolean
  afterId?: number
  limit?: number
}

// Docker compose log format: "service-name  | actual log content"
// Handles various spacing: "svc |msg", "svc | msg", "svc |  msg", "svc |" (empty)
const DOCKER_COMPOSE_REGEX = /^([a-zA-Z0-9_-]+(?:-\d+)?)\s+\|\s*(.*)$/

// ANSI escape code pattern (colors, formatting, etc.)
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*m/g

/**
 * Strip ANSI escape codes from a string.
 */
function stripAnsi(str: string): string {
  return str.replace(ANSI_ESCAPE_REGEX, '')
}

/**
 * Parse Docker compose source from a raw log line.
 * Returns { source, content } if matched, or null if not a docker compose format.
 */
export function parseDockerSource(raw: string): { source: string; content: string } | null {
  // Strip ANSI codes before matching (Docker Compose often colorizes output)
  const cleaned = stripAnsi(raw)
  const match = cleaned.match(DOCKER_COMPOSE_REGEX)
  if (match) {
    return { source: match[1], content: match[2] }
  }
  return null
}

/**
 * Enrich a log entry with parsed source if not already present.
 * This handles Docker compose formatted logs on the frontend.
 * When a Docker source is detected, the prefix is stripped from the message.
 */
export function enrichLogEntry(entry: LogEntry): LogEntry {
  // If source is already parsed, return as-is
  if (entry.parsed?.source) {
    return entry
  }

  const dockerParsed = parseDockerSource(entry.raw)
  if (dockerParsed) {
    // Re-parse the stripped content to extract structured fields if present
    // For now, just use the stripped content as the message
    return {
      ...entry,
      parsed: {
        ...entry.parsed,
        source: dockerParsed.source,
        // Always use the stripped content (without docker prefix)
        message: dockerParsed.content,
      },
    }
  }

  return entry
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
