import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export type MonoFont =
  | 'google-sans-code'
  | 'inconsolata'
  | 'pitagon-sans-mono'
  | 'reddit-mono'
  | 'commit-mono'

export const MONO_FONTS: { id: MonoFont; name: string; family: string }[] = [
  { id: 'google-sans-code', name: 'Google Sans Code', family: "'Google Sans Code Variable'" },
  { id: 'inconsolata', name: 'Inconsolata', family: "'Inconsolata Variable'" },
  { id: 'pitagon-sans-mono', name: 'Pitagon Sans Mono', family: "'Pitagon Sans Mono'" },
  { id: 'reddit-mono', name: 'Reddit Mono', family: "'Reddit Mono Variable'" },
  { id: 'commit-mono', name: 'Commit Mono', family: "'Commit Mono'" },
]

export interface ColumnVisibility {
  timestamp: boolean
  level: boolean
  fields: boolean
}

export interface Settings {
  maxLinesPerEntry: number
  monoFont: MonoFont
  columns: ColumnVisibility
  theme: Theme
}

const STORAGE_KEY = 'logbro-settings'

const DEFAULT_SETTINGS: Settings = {
  maxLinesPerEntry: 1,
  monoFont: 'reddit-mono',
  columns: {
    timestamp: true,
    level: true,
    fields: true,
  },
  theme: 'system',
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
    // Update CSS custom property for mono font
    const font = MONO_FONTS.find((f) => f.id === settings.monoFont)
    if (font) {
      document.documentElement.style.setProperty(
        '--mono-font',
        `${font.family}, ui-monospace, SFMono-Regular, monospace`
      )
    }
    // Apply theme
    applyTheme(settings.theme)
  }, [settings])

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    if (settings.theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.theme])

  // Apply theme on initial load
  useEffect(() => {
    applyTheme(loadSettings().theme)
  }, [])

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  return { settings, updateSetting }
}
