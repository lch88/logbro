import { useEffect, useRef, useState } from 'react'
import { useLogs } from '@/hooks/use-logs'
import { useSettings } from '@/hooks/use-settings'
import type { LogEntry } from '@/lib/api'
import { LogToolbar } from './log-toolbar'
import { LogList } from './log-list'
import { LogDetailPanel } from './log-detail-panel'
import { StatusBar } from './status-bar'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

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

  return (
    <div className="flex flex-col h-full">
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
