import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { endOfMonth, startOfMonth } from 'date-fns'
import { useMemo } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { ModeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { UtDndProvider } from '@/components/ut/dnd/dnd-provider'
import { useCalendarData } from '@/hooks/use-ut'
import { useAuthStore } from '@/stores/auth'
import { useUtStore } from '@/stores/ut'
import type { Project } from '@/types/ut'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (!token) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { currentDate, setSelectedDate, setPrefilledProject, setFormOpen } = useUtStore()
  const monthRange = useMemo(
    () => ({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }),
    [currentDate],
  )
  const { stats, isPending } = useCalendarData(monthRange.start, monthRange.end)

  function handleDrop(project: Project, date: string): void {
    setSelectedDate(date)
    setPrefilledProject(project)
    setFormOpen(true)
  }

  return (
    <UtDndProvider onDrop={handleDrop}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-sidebar px-4 py-2">
            <div className="flex shrink-0 items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              {isPending ? (
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Badge className="border-transparent bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    剩余:
                    <span className="ml-0.5 font-semibold tabular-nums">
                      {stats.totalManDaysRemaining}
                    </span>
                  </Badge>
                  {stats.checkCount > 0 && (
                    <Badge className="border-transparent bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                      待审:
                      <span className="ml-0.5 font-semibold tabular-nums">{stats.checkCount}</span>
                    </Badge>
                  )}
                  {stats.rejectedCount > 0 && (
                    <Badge className="border-transparent bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-300">
                      驳回:
                      <span className="ml-0.5 font-semibold tabular-nums">
                        {stats.rejectedCount}
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <ModeToggle />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UtDndProvider>
  )
}
