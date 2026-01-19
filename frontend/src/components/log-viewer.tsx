import { useEffect, useRef } from 'react'
import { useLogs } from '~/hooks/use-logs'
import { LogToolbar } from './log-toolbar'
import { LogList } from './log-list'
import { StatusBar } from './status-bar'

export function LogViewer() {
  const {
    logs,
    filter,
    paused,
    stdinOpen,
    connected,
    loading,
    setPaused,
    applyFilter,
    clearAll,
  } = useLogs()

  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const prevLogCountRef = useRef(0)

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (!autoScrollRef.current || !containerRef.current) return
    if (logs.length > prevLogCountRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
    prevLogCountRef.current = logs.length
  }, [logs.length])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // Disable auto-scroll if user scrolled up more than 50px from bottom
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50
  }

  const handleScrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      autoScrollRef.current = true
    }
  }

  return (
    <div className="flex flex-col h-full">
      <LogToolbar
        filter={filter}
        onFilterChange={applyFilter}
        paused={paused}
        onPauseToggle={() => setPaused(!paused)}
        onClear={clearAll}
        onScrollToBottom={handleScrollToBottom}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No logs yet. Waiting for input...
          </div>
        ) : (
          <LogList logs={logs} searchTerm={filter.search} />
        )}
      </div>

      <StatusBar
        connected={connected}
        stdinOpen={stdinOpen}
        logCount={logs.length}
        paused={paused}
      />
    </div>
  )
}
