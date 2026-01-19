import { createFileRoute } from '@tanstack/react-router'
import { LogViewer } from '@/components/log-viewer'

export const Route = createFileRoute('/')({
  component: LogViewer,
})
