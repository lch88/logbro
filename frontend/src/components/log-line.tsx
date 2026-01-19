import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/lib/api'

interface LogLineProps {
  entry: LogEntry
  lineNumber: number
  searchTerm?: string
  maxLines?: number
  selected?: boolean
  onClick?: () => void
}

const levelColors: Record<string, string> = {
  DEBUG: 'text-gray-500',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-500 font-bold',
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const LogLine = memo(function LogLine({
  entry,
  lineNumber,
  searchTerm,
  maxLines = 1,
  selected = false,
  onClick,
}: LogLineProps) {
  const level = entry.parsed?.level || ''
  const colorClass = levelColors[level] || 'text-foreground'

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

  return (
    <div
      className={cn(
        'flex items-start py-0.5 px-2 hover:bg-muted/50 border-b border-border/20 group cursor-pointer',
        colorClass,
        selected && 'bg-muted/80 hover:bg-muted/80'
      )}
      onClick={handleClick}
      onDoubleClick={handleCopy}
      title="Click to view details, double-click to copy"
    >
      <span className="w-14 shrink-0 text-muted-foreground text-right pr-3 select-none tabular-nums">
        {lineNumber}
      </span>
      <span
        className="whitespace-pre-wrap break-all flex-1 overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {highlightSearch(entry.raw)}
      </span>
    </div>
  )
})
