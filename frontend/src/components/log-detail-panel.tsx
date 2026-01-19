import { useCallback } from 'react'
import type { LogEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface LogDetailPanelProps {
  entry: LogEntry
  onClose: () => void
}

const levelColors: Record<string, string> = {
  DEBUG: 'text-gray-500',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  FATAL: 'text-red-500',
}

export function LogDetailPanel({ entry, onClose }: LogDetailPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(entry.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [entry.raw])

  const level = entry.parsed?.level
  const levelColor = level ? levelColors[level] : ''

  return (
    <div className="border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium text-sm">Log Details</h3>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Metadata */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-20">ID:</span>
            <span className="font-mono">{entry.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-20">Timestamp:</span>
            <span className="font-mono">{entry.timestamp}</span>
          </div>
          {level && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">Level:</span>
              <span className={cn('font-mono font-medium', levelColor)}>{level}</span>
            </div>
          )}
          {entry.parsed?.source && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">Source:</span>
              <span className="font-mono">{entry.parsed.source}</span>
            </div>
          )}
        </div>

        {/* Raw content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Raw</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-6 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="font-mono text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap break-all overflow-auto max-h-[300px]">
            {entry.raw}
          </pre>
        </div>

        {/* Parsed fields */}
        {entry.parsed?.fields && Object.keys(entry.parsed.fields).length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Fields</span>
            <div className="bg-muted/50 p-3 rounded-md space-y-1">
              {Object.entries(entry.parsed.fields).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message if different from raw */}
        {entry.parsed?.message && entry.parsed.message !== entry.raw && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Message</span>
            <pre className="font-mono text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap break-all">
              {entry.parsed.message}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
