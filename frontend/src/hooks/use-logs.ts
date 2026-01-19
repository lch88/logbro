import { useCallback, useEffect, useRef, useState } from 'react'
import type { LogEntry, LogFilter } from '@/lib/api'
import { fetchLogs } from '@/lib/api'
import { useWebSocket } from './use-websocket'

const MAX_LOGS = 10000

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogFilter>({})
  const [paused, setPaused] = useState(false)
  const [stdinOpen, setStdinOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const handleNewLog = useCallback((entry: LogEntry) => {
    if (pausedRef.current) return

    setLogs((prev) => {
      // Deduplicate by ID to avoid duplicates from REST/WebSocket race
      if (prev.some((e) => e.id === entry.id)) {
        return prev
      }
      const next = [...prev, entry]
      if (next.length > MAX_LOGS) {
        return next.slice(-MAX_LOGS)
      }
      return next
    })
  }, [])

  const { connected, updateFilter } = useWebSocket({
    onLog: handleNewLog,
    onStatusChange: setStdinOpen,
    filter,
  })

  const loadInitialLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchLogs({ ...filter, limit: MAX_LOGS })
      setLogs(response.logs)
    } catch (e) {
      console.error('Failed to load initial logs:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const applyFilter = useCallback(
    (newFilter: LogFilter) => {
      setFilter(newFilter)
      updateFilter(newFilter)
      // Reload logs with new filter
      setLoading(true)
      fetchLogs({ ...newFilter, limit: MAX_LOGS })
        .then((res) => {
          setLogs(res.logs)
        })
        .catch((e) => {
          console.error('Failed to apply filter:', e)
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [updateFilter]
  )

  const clearAll = useCallback(() => {
    setLogs([])
  }, [])

  useEffect(() => {
    loadInitialLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    logs,
    filter,
    paused,
    stdinOpen,
    connected,
    loading,
    setPaused,
    applyFilter,
    loadInitialLogs,
    clearAll,
  }
}
