import { useCallback, useEffect, useRef, useState } from 'react'
import type { LogEntry, LogFilter } from '@/lib/api'

interface WSMessage {
  type: 'log' | 'status' | 'pong'
  data?: LogEntry | { stdinOpen: boolean }
}

interface UseWebSocketOptions {
  onLog: (entry: LogEntry) => void
  onStatusChange?: (stdinOpen: boolean) => void
  filter?: LogFilter
}

export function useWebSocket({ onLog, onStatusChange, filter }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const filterRef = useRef(filter)

  // Keep filter ref updated
  filterRef.current = filter

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Subscribe with current filter
      if (filterRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', filter: filterRef.current }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)

        switch (msg.type) {
          case 'log':
            onLog(msg.data as LogEntry)
            break
          case 'status':
            const status = msg.data as { stdinOpen: boolean }
            onStatusChange?.(status.stdinOpen)
            break
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // Reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 2000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [onLog, onStatusChange])

  const updateFilter = useCallback((newFilter: LogFilter) => {
    filterRef.current = newFilter
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', filter: newFilter }))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  return { connected, updateFilter }
}
