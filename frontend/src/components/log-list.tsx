import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry } from '@/lib/api'
import { LogLine } from './log-line'

interface LogListProps {
  logs: LogEntry[]
  searchTerm?: string
  maxLines?: number
  selectedId?: number
  onSelect?: (entry: LogEntry) => void
}

export function LogList({ logs, searchTerm, maxLines, selectedId, onSelect }: LogListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
    measureElement: (element) => element.getBoundingClientRect().height,
  })

  // Scroll selected item into view when selectedId changes
  useEffect(() => {
    if (selectedId === undefined) return
    const index = logs.findIndex((l) => l.id === selectedId)
    if (index !== -1) {
      virtualizer.scrollToIndex(index, { align: 'auto' })
    }
  }, [selectedId, logs, virtualizer])

  const items = virtualizer.getVirtualItems()

  return (
    <div ref={parentRef} className="h-full overflow-auto font-mono text-xs">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const log = logs[virtualRow.index]
          if (!log) return null
          return (
            <div
              key={log.id}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LogLine
                entry={log}
                lineNumber={virtualRow.index + 1}
                searchTerm={searchTerm}
                maxLines={maxLines}
                selected={log.id === selectedId}
                onClick={() => onSelect?.(log)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
