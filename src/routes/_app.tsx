import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { ChartNoAxesColumnIncreasing } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { UtDndProvider } from '@/components/ut/dnd/dnd-provider'
import { RejectedUtDialog } from '@/components/ut/rejected-ut-dialog'
import { UtSummaryMenu } from '@/components/ut/ut-summary-menu'
import { UtYearlyChartDialog } from '@/components/ut/yearly-chart/ut-yearly-chart-dialog'
import { useCalendarData } from '@/hooks/use-ut'
import { countWorkdaysInRange } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
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
  const {
    currentDate,
    setSelectedDate,
    setPrefilledProject,
    setFormOpen,
    highlightUnfilled,
    setHighlightUnfilled,
  } = useUtStore()
  const [chartOpen, setChartOpen] = useState(false)
  const monthRange = useMemo(
    () => ({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }),
    [currentDate],
  )
  const { dailyMap, stats, isPending } = useCalendarData(monthRange.start, monthRange.end)

  const monthLabel = useMemo(() => format(currentDate, 'yyyy年M月'), [currentDate])
  const unfilledUt = useMemo(() => {
    const today = new Date()
    const end = monthRange.end > today ? today : monthRange.end
    const totalWorkdays = countWorkdaysInRange(monthRange.start, end)
    const filledUt = Array.from(dailyMap.values()).reduce((sum, d) => sum + d.totalUt, 0)
    return Math.round(Math.max(0, totalWorkdays - filledUt) * 10) / 10
  }, [monthRange.start, monthRange.end, dailyMap])

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
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              {isPending ? (
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ) : (
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                  {unfilledUt > 0 && (
                    <Badge
                      className={cn(
                        'cursor-pointer px-2 py-0.5 text-xs transition-colors',
                        'hover:bg-orange-200/50 dark:hover:bg-orange-800/50',
                        highlightUnfilled
                          ? 'border-orange-200 bg-orange-100 text-orange-800 shadow-sm dark:border-orange-700 dark:bg-orange-800/50 dark:text-orange-200'
                          : 'border-transparent bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
                      )}
                      onClick={() => setHighlightUnfilled(!highlightUnfilled)}
                    >
                      {monthLabel}-未填UT:
                      <span className="ml-0.5 font-semibold tabular-nums">{unfilledUt}</span>
                    </Badge>
                  )}
                  {stats.checkCount > 0 && (
                    <Badge className="border-transparent bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                      待审:
                      <span className="ml-0.5 font-semibold tabular-nums">{stats.checkCount}</span>
                    </Badge>
                  )}
                  <Badge className="border-transparent bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    剩余:
                    <span className="ml-0.5 font-semibold tabular-nums">
                      {stats.totalManDaysRemaining}
                    </span>
                  </Badge>
                  {stats.rejectedCount > 0 && (
                    <RejectedUtDialog rejectedCount={stats.rejectedCount} />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChartOpen(true)}
                aria-label="查看年度项目工时"
              >
                <ChartNoAxesColumnIncreasing />
              </Button>
              <UtSummaryMenu />
            </div>
          </header>

          <UtYearlyChartDialog open={chartOpen} onOpenChange={setChartOpen} />

          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UtDndProvider>
  )
}
