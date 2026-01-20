import { useCallback, useEffect, useRef, useState } from 'react'
import { useLogs } from '@/hooks/use-logs'
import { useSettings } from '@/hooks/use-settings'
import type { LogEntry } from '@/lib/api'
import { LogToolbar } from './log-toolbar'
import { LogList } from './log-list'
import { LogDetailPanel } from './log-detail-panel'
import { StatusBar } from './status-bar'
import { SourceTabs } from './source-tabs'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export function LogViewer() {
  const {
    logs,
    sources,
    filter,
    paused,
    stdinOpen,
    connected,
    loading,
    setPaused,
    applyFilter,
    clearAll,
  } = useLogs()

  const { settings, updateSetting } = useSettings()
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

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

  const handleSelectLog = (entry: LogEntry) => {
    setSelectedLog(entry)
  }

  const handleCloseDetail = () => {
    setSelectedLog(null)
  }

  // Source filtering handlers
  const handleSourceToggle = useCallback(
    (source: string) => {
      const currentSources = filter.sources || []
      const newSources = currentSources.includes(source)
        ? currentSources.filter((s) => s !== source)
        : [...currentSources, source]
      applyFilter({ ...filter, sources: newSources })
    },
    [filter, applyFilter]
  )

  const handleClearSourceFilter = useCallback(() => {
    applyFilter({ ...filter, sources: [] })
  }, [filter, applyFilter])

  // Determine if we should show source badges in log lines
  // Show them only if there are multiple sources
  const showSourceBadges = sources.length > 1

  // Keyboard navigation for log list
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (logs.length === 0) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = selectedLog
          ? logs.findIndex((l) => l.id === selectedLog.id)
          : -1

        let nextIndex: number
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < logs.length - 1 ? currentIndex + 1 : currentIndex
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : 0
        }

        const nextLog = logs[nextIndex]
        if (nextLog) {
          setSelectedLog(nextLog)
        }
      } else if (e.key === 'Escape' && selectedLog) {
        setSelectedLog(null)
      }
    },
    [logs, selectedLog]
  )

  return (
    <div className="flex flex-col h-full" tabIndex={0} onKeyDown={handleKeyDown}>
      <LogToolbar
        filter={filter}
        onFilterChange={applyFilter}
        paused={paused}
        onPauseToggle={() => setPaused(!paused)}
        onClear={clearAll}
        onScrollToBottom={handleScrollToBottom}
        settings={settings}
        onSettingChange={updateSetting}
      />

      {sources.length > 1 && (
        <SourceTabs
          sources={sources}
          selectedSources={filter.sources || []}
          onSourceToggle={handleSourceToggle}
          onClearAll={handleClearSourceFilter}
        />
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={selectedLog ? "60%" : "100%"} minSize="20%">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full overflow-auto"
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
              <LogList
                logs={logs}
                searchTerm={filter.search}
                maxLines={settings.maxLinesPerEntry}
                selectedId={selectedLog?.id}
                onSelect={handleSelectLog}
                showSource={showSourceBadges}
                columns={settings.columns}
              />
            )}
          </div>
        </ResizablePanel>

        {selectedLog && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="30%" minSize="20em" maxSize="60%">
              <LogDetailPanel entry={selectedLog} onClose={handleCloseDetail} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <StatusBar
        connected={connected}
        stdinOpen={stdinOpen}
        logCount={logs.length}
        paused={paused}
      />
    </div>
  )
}
