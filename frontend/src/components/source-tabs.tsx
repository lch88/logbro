import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SourceTabsProps {
  sources: string[]
  selectedSources: string[]
  onSourceToggle: (source: string) => void
  onClearAll: () => void
}

// Generate consistent colors for sources based on hash
function getSourceColor(source: string): string {
  const colors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'bg-red-500/20 text-red-400 border-red-500/30',
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'bg-teal-500/20 text-teal-400 border-teal-500/30',
  ]

  let hash = 0
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getSourceColorClass(source: string): string {
  return getSourceColor(source)
}

export function SourceTabs({
  sources,
  selectedSources,
  onSourceToggle,
  onClearAll,
}: SourceTabsProps) {
  if (sources.length === 0) {
    return null
  }

  const hasSelection = selectedSources.length > 0

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 overflow-x-auto">
      <span className="text-xs text-muted-foreground shrink-0 mr-1">Sources:</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className={cn(
          'h-6 px-2 text-xs',
          !hasSelection && 'bg-primary/20 text-primary'
        )}
      >
        All
      </Button>

      {sources.map((source) => {
        const isSelected = selectedSources.includes(source)
        const colorClass = getSourceColor(source)

        return (
          <Badge
            key={source}
            variant="outline"
            className={cn(
              'cursor-pointer hover:opacity-80 transition-opacity border',
              isSelected ? colorClass : 'bg-transparent text-muted-foreground border-muted'
            )}
            onClick={() => onSourceToggle(source)}
          >
            {source}
          </Badge>
        )
      })}
    </div>
  )
}
