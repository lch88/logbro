import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="h-screen w-screen overflow-hidden">
      <Outlet />
    </div>
  ),
})
