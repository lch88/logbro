import { cn } from '~/lib/utils'

interface StatusBarProps {
  connected: boolean
  stdinOpen: boolean
  logCount: number
  paused: boolean
}

export function StatusBar({ connected, stdinOpen, logCount, paused }: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Stdin status */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            stdinOpen ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
          )}
        />
        <span>{stdinOpen ? 'Streaming' : 'Stream ended'}</span>
      </div>

      {/* Log count */}
      <span>{logCount.toLocaleString()} logs</span>

      {/* Paused indicator */}
      {paused && (
        <span className="text-yellow-500 font-medium">PAUSED</span>
      )}

      {/* Keyboard shortcut hints */}
      <div className="ml-auto text-muted-foreground/60">
        Double-click to copy line
      </div>
    </div>
  )
}
