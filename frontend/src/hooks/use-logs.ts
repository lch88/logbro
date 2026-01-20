import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LogEntry, LogFilter } from '@/lib/api'
import { fetchLogs, enrichLogEntry } from '@/lib/api'
import { useWebSocket } from './use-websocket'

const MAX_LOGS = 10000

export function useLogs() {
  const [allLogs, setAllLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogFilter>({})
  const [paused, setPaused] = useState(false)
  const [stdinOpen, setStdinOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const handleNewLog = useCallback((entry: LogEntry) => {
    if (pausedRef.current) return

    // Enrich with parsed source
    const enrichedEntry = enrichLogEntry(entry)

    setAllLogs((prev) => {
      // Deduplicate by ID to avoid duplicates from REST/WebSocket race
      if (prev.some((e) => e.id === entry.id)) {
        return prev
      }
      const next = [...prev, enrichedEntry]
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

  // Compute unique sources from all logs
  const sources = useMemo(() => {
    const sourceSet = new Set<string>()
    for (const log of allLogs) {
      const source = log.parsed?.source
      if (source) {
        sourceSet.add(source)
      }
    }
    return Array.from(sourceSet).sort()
  }, [allLogs])

  // Apply client-side source filtering
  const logs = useMemo(() => {
    if (!filter.sources || filter.sources.length === 0) {
      return allLogs
    }
    return allLogs.filter((log) => {
      const source = log.parsed?.source
      return source && filter.sources!.includes(source)
    })
  }, [allLogs, filter.sources])

  const loadInitialLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchLogs({ ...filter, limit: MAX_LOGS })
      // Enrich all fetched logs with parsed source
      const enrichedLogs = response.logs.map(enrichLogEntry)
      setAllLogs(enrichedLogs)
    } catch (e) {
      console.error('Failed to load initial logs:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const applyFilter = useCallback(
    (newFilter: LogFilter) => {
      setFilter(newFilter)
      // Only send non-source filters to the server
      const { sources: _, ...serverFilter } = newFilter
      updateFilter(serverFilter)
      // Reload logs with new filter (without source filter - that's client-side)
      setLoading(true)
      fetchLogs({ ...serverFilter, limit: MAX_LOGS })
        .then((res) => {
          const enrichedLogs = res.logs.map(enrichLogEntry)
          setAllLogs(enrichedLogs)
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
    setAllLogs([])
  }, [])

  useEffect(() => {
    loadInitialLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    logs,
    allLogs,
    sources,
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
