import type { Settings } from '@/hooks/use-settings'
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
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="maxLines" className="text-xs whitespace-nowrap">
              Max lines per entry
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
              className="w-20 text-right"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
