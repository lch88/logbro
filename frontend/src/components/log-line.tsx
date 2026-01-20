import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/lib/api'
import type { ColumnVisibility } from '@/hooks/use-settings'
import { getSourceColorClass } from './source-tabs'

interface LogLineProps {
  entry: LogEntry
  lineNumber: number
  searchTerm?: string
  maxLines?: number
  selected?: boolean
  onClick?: () => void
  showSource?: boolean
  columns?: ColumnVisibility
}

const levelColors: Record<string, string> = {
  DEBUG: 'text-gray-500',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-500 font-bold',
}

const levelBgColors: Record<string, string> = {
  DEBUG: 'bg-gray-500/10',
  INFO: 'bg-blue-500/10',
  WARN: 'bg-yellow-500/10',
  ERROR: 'bg-red-500/10',
  FATAL: 'bg-red-500/20',
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function formatTime(time: string | undefined): string {
  if (!time) return ''
  // Try to extract just the time portion (HH:MM:SS) from various formats
  const match = time.match(/(\d{2}:\d{2}:\d{2})/)
  if (match) return match[1]
  return time
}

function formatFields(fields: Record<string, unknown> | undefined): string {
  if (!fields || Object.keys(fields).length === 0) return ''
  return Object.entries(fields)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ')
}

const defaultColumns: ColumnVisibility = {
  timestamp: true,
  level: true,
  fields: true,
}

export const LogLine = memo(function LogLine({
  entry,
  lineNumber,
  searchTerm,
  maxLines = 1,
  selected = false,
  onClick,
  showSource = true,
  columns = defaultColumns,
}: LogLineProps) {
  const parsed = entry.parsed
  const level = parsed?.level || ''
  const source = parsed?.source
  const levelColor = levelColors[level] || ''
  const levelBg = levelBgColors[level] || ''

  // Get display values
  const time = formatTime(parsed?.time)
  const message = parsed?.message || entry.raw
  const fields = formatFields(parsed?.fields)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(entry.raw)
  }, [entry.raw])

  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  const highlightSearch = (text: string) => {
    if (!searchTerm) return text

    try {
      const parts = text.split(new RegExp(`(${escapeRegex(searchTerm)})`, 'gi'))
      return parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/40 text-inherit">
            {part}
          </mark>
        ) : (
          part
        )
      )
    } catch {
      return text
    }
  }

  // Unified layout - all messages in single column with fixed-width metadata columns
  return (
    <div
      className={cn(
        'flex items-start py-0.5 px-2 hover:bg-muted/50 border-b border-border/20 cursor-pointer',
        levelBg,
        selected && 'bg-muted/80 hover:bg-muted/80'
      )}
      onClick={handleClick}
      onDoubleClick={handleCopy}
      title="Click to view details, double-click to copy"
    >
      {/* Index */}
      <span className="w-12 shrink-0 text-muted-foreground text-right pr-2 select-none tabular-nums">
        {lineNumber}
      </span>

      {/* Source badge - fixed width for alignment */}
      {showSource && (
        <span className="w-28 shrink-0 mr-2">
          {source && (
            <span
              className={cn(
                'inline-block max-w-full px-1.5 py-0 rounded text-[10px] font-medium border truncate',
                getSourceColorClass(source)
              )}
              title={source}
            >
              {source}
            </span>
          )}
        </span>
      )}

      {/* Timestamp - fixed width, empty if not available */}
      {columns.timestamp && (
        <span className="w-20 shrink-0 text-muted-foreground tabular-nums pr-2">
          {time}
        </span>
      )}

      {/* Level - fixed width, empty if not available */}
      {columns.level && (
        <span className={cn('w-14 shrink-0 font-medium pr-2', levelColor)}>
          {level}
        </span>
      )}

      {/* Message - always in same column */}
      <span
        className={cn(
          'flex-1 min-w-0 pr-2 overflow-hidden whitespace-pre-wrap break-all',
          levelColor || 'text-muted-foreground'
        )}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {highlightSearch(message)}
      </span>

      {/* Fields */}
      {columns.fields && fields && (
        <span
          className="shrink-0 max-w-[300px] text-muted-foreground truncate"
          title={fields}
        >
          {fields}
        </span>
      )}
    </div>
  )
})
