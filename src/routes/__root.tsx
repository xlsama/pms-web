import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { NotFound } from '@/components/not-found'
import { ThemeProvider } from '@/contexts/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <Outlet />
      <Toaster position="top-center" />
      <TanStackRouterDevtools position="bottom-right" />
    </ThemeProvider>
  )
}
