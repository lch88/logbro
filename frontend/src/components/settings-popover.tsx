import { type Settings, MONO_FONTS } from '@/hooks/use-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings as SettingsIcon } from 'lucide-react'

interface SettingsPopoverProps {
  settings: Settings
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export function SettingsPopover({
  settings,
  onSettingChange,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" title="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="maxLines" className="text-xs whitespace-nowrap">
              Max lines
            </Label>
            <Input
              id="maxLines"
              type="number"
              min={1}
              max={100}
              value={settings.maxLinesPerEntry}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                if (value >= 1 && value <= 100) {
                  onSettingChange('maxLinesPerEntry', value)
                }
              }}
              className="w-16 text-right"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label className="text-xs">Font</Label>
            <Select
              value={settings.monoFont}
              onValueChange={(value) => onSettingChange('monoFont', value as Settings['monoFont'])}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONO_FONTS.map((font) => (
                  <SelectItem
                    key={font.id}
                    value={font.id}
                    style={{ fontFamily: `${font.family}, monospace` }}
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
