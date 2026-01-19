import { useCallback, useState } from 'react'
import type { LogEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

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

function FieldRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const [copied, setCopied] = useState(false)
  const isObject = typeof value === 'object' && value !== null
  const displayValue = isObject ? JSON.stringify(value) : String(value)

  const handleCopy = () => {
    copyToClipboard(displayValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <tr className="group align-top">
      <td className="text-muted-foreground pr-3 py-0.5 whitespace-nowrap">
        {fieldKey}
      </td>
      <td className="py-0.5 break-all">
        {displayValue}
        <button
          onClick={handleCopy}
          className={cn(
            'inline-flex ml-1 p-0.5 rounded align-middle',
            copied
              ? 'text-green-500'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted'
          )}
          title="Copy value"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </td>
    </tr>
  )
}

export function LogDetailPanel({ entry, onClose }: LogDetailPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyRaw = useCallback(() => {
    copyToClipboard(entry.raw)
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

        {/* Message */}
        {entry.parsed?.message && entry.parsed.message !== entry.raw && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Message</span>
            <pre className="font-mono text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap break-all">
              {entry.parsed.message}
            </pre>
          </div>
        )}

        {/* Parsed fields */}
        {entry.parsed?.fields && Object.keys(entry.parsed.fields).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Fields ({Object.keys(entry.parsed.fields).length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(entry.parsed!.fields, null, 2))}
                className="h-6 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy all
              </Button>
            </div>
            <div className="bg-muted/50 rounded-md px-3 py-2">
              <table className="text-xs font-mono">
                <tbody>
                  {Object.entries(entry.parsed.fields).map(([key, value]) => (
                    <FieldRow key={key} fieldKey={key} value={value} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Raw content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Raw</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyRaw}
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
      </div>
    </div>
  )
}
