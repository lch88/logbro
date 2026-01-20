import { Settings2, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { Settings, MonoFont, ColumnVisibility, Theme } from '@/hooks/use-settings'
import { MONO_FONTS } from '@/hooks/use-settings'

const THEMES: { id: Theme; name: string; icon: typeof Sun }[] = [
  { id: 'light', name: 'Light', icon: Sun },
  { id: 'dark', name: 'Dark', icon: Moon },
  { id: 'system', name: 'System', icon: Monitor },
]

interface SettingsPopoverProps {
  settings: Settings
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function SettingsPopover({ settings, onSettingChange }: SettingsPopoverProps) {
  const currentFont = MONO_FONTS.find((f) => f.id === settings.monoFont)

  const handleColumnToggle = (column: keyof ColumnVisibility) => {
    onSettingChange('columns', {
      ...settings.columns,
      [column]: !settings.columns[column],
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" title="Settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Display Settings</h4>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Theme</Label>
            <div className="flex items-center gap-1">
              {THEMES.map((theme) => {
                const Icon = theme.icon
                return (
                  <Button
                    key={theme.id}
                    size="sm"
                    variant={settings.theme === theme.id ? 'default' : 'outline'}
                    className="h-8 flex-1 gap-1.5"
                    onClick={() => onSettingChange('theme', theme.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{theme.name}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Column visibility */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Visible columns
            </Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={settings.columns.timestamp}
                  onCheckedChange={() => handleColumnToggle('timestamp')}
                />
                Timestamp
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={settings.columns.level}
                  onCheckedChange={() => handleColumnToggle('level')}
                />
                Level
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={settings.columns.fields}
                  onCheckedChange={() => handleColumnToggle('fields')}
                />
                Fields
              </label>
            </div>
          </div>

          {/* Max lines per entry */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Max lines per log entry
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 10].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={settings.maxLinesPerEntry === n ? 'default' : 'outline'}
                  className="h-7 px-2 text-xs"
                  onClick={() => onSettingChange('maxLinesPerEntry', n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {/* Monospace font */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Monospace font
            </Label>
            <Select
              value={settings.monoFont}
              onValueChange={(value) => onSettingChange('monoFont', value as MonoFont)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <span style={{ fontFamily: currentFont?.family }}>
                    {currentFont?.name}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONO_FONTS.map((font) => (
                  <SelectItem
                    key={font.id}
                    value={font.id}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
