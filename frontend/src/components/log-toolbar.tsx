import { useState } from 'react'
import type { LogFilter } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import {
  Pause,
  Play,
  Search,
  Trash2,
  ArrowDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogToolbarProps {
  filter: LogFilter
  onFilterChange: (filter: LogFilter) => void
  paused: boolean
  onPauseToggle: () => void
  onClear: () => void
  onScrollToBottom: () => void
}

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const

const levelColors: Record<string, string> = {
  DEBUG: 'data-[state=on]:bg-gray-600',
  INFO: 'data-[state=on]:bg-blue-600',
  WARN: 'data-[state=on]:bg-yellow-600',
  ERROR: 'data-[state=on]:bg-red-600',
  FATAL: 'data-[state=on]:bg-red-800',
}

export function LogToolbar({
  filter,
  onFilterChange,
  paused,
  onPauseToggle,
  onClear,
  onScrollToBottom,
}: LogToolbarProps) {
  const [search, setSearch] = useState(filter.search || '')
  const [regex, setRegex] = useState(filter.regex || false)
  const [levels, setLevels] = useState<string[]>(filter.levels || [])

  const handleSearchSubmit = () => {
    onFilterChange({ ...filter, search, regex, levels })
  }

  const handleSearchClear = () => {
    setSearch('')
    onFilterChange({ ...filter, search: '', regex, levels })
  }

  const handleLevelToggle = (level: string) => {
    const newLevels = levels.includes(level)
      ? levels.filter((l) => l !== level)
      : [...levels, level]
    setLevels(newLevels)
    onFilterChange({ ...filter, search, regex, levels: newLevels })
  }

  const handleRegexToggle = (newRegex: boolean) => {
    setRegex(newRegex)
    if (search) {
      onFilterChange({ ...filter, search, regex: newRegex, levels })
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-background">
      {/* Search */}
      <div className="flex items-center gap-1 flex-1 max-w-md">
        <div className="relative flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            placeholder="Search logs..."
            className="pr-8"
          />
          {search && (
            <button
              onClick={handleSearchClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={handleSearchSubmit}>
          <Search className="h-4 w-4" />
        </Button>
        <Toggle
          pressed={regex}
          onPressedChange={handleRegexToggle}
          aria-label="Toggle regex"
          title="Use regex"
          size="sm"
          className="font-mono text-xs"
        >
          .*
        </Toggle>
      </div>

      {/* Level filters */}
      <div className="flex items-center gap-1 ml-2">
        {LOG_LEVELS.map((level) => (
          <Toggle
            key={level}
            pressed={levels.includes(level)}
            onPressedChange={() => handleLevelToggle(level)}
            size="sm"
            className={cn('text-xs', levelColors[level])}
          >
            {level}
          </Toggle>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          size="icon"
          variant="ghost"
          onClick={onScrollToBottom}
          title="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onPauseToggle}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
          title="Clear logs"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
