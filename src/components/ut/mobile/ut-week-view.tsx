import { useMemo, useState } from 'react'
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getWeek,
  isToday,
  isWeekend,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UtDayCard } from './ut-day-card'
import { UtDayDrawer } from './ut-day-drawer'
import { Button } from '@/components/ui/button'
import { useMonthlyUt } from '@/hooks/use-ut'
import { buildDailySummaries, extractProjects } from '@/lib/ut-utils'
import { useUtStore } from '@/stores/ut'

export function UtWeekView() {
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate } = useUtStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 })

  const { data } = useMonthlyUt(currentDate.getFullYear(), currentDate.getMonth() + 1)

  function navigateWeek(delta: number): void {
    const newDate = delta > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1)
    setCurrentDate(newDate)
  }

  function goToToday(): void {
    setCurrentDate(new Date())
  }

  // Build daily summaries map
  const dailySummaries = useMemo(() => buildDailySummaries(data?.list), [data])

  // Extract projects
  const projects = useMemo(() => extractProjects(data?.list), [data])

  function handleDayClick(date: string): void {
    setSelectedDate(date)
    setDrawerOpen(true)
  }

  function handleDrawerClose(): void {
    setDrawerOpen(false)
    setSelectedDate(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Compact Header Card */}
      <div className="m-3 mb-0 rounded-lg bg-muted/50 p-3">
        {/* First row: Navigation + Date + Stats */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Navigation + Date */}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => navigateWeek(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-0 truncate text-sm font-medium">
              {format(weekStart, 'M月d日', { locale: zhCN })} -{' '}
              {format(weekEnd, 'M月d日', { locale: zhCN })}
              <span className="ml-1 text-xs text-muted-foreground max-[360px]:hidden">
                · 第{weekNumber}周
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => navigateWeek(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Right: Stats badges + Today button */}
          <div className="flex shrink-0 items-center gap-1.5">
            {data && (
              <>
                <span className="rounded bg-background px-1.5 py-0.5 text-xs">
                  剩余:
                  <span className="font-semibold tabular-nums">{data.totalManDaysRemaining}</span>
                </span>
                {data.checkCount > 0 && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    待审:<span className="font-semibold tabular-nums">{data.checkCount}</span>
                  </span>
                )}
              </>
            )}
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={goToToday}>
              本周
            </Button>
          </div>
        </div>
      </div>

      {/* Day cards */}
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const summary = dailySummaries.get(dateStr)

          return (
            <UtDayCard
              key={dateStr}
              date={dateStr}
              isToday={isToday(day)}
              isWeekend={isWeekend(day)}
              summary={summary}
              onClick={() => handleDayClick(dateStr)}
            />
          )
        })}
      </div>

      {/* Drawer */}
      {selectedDate && (
        <UtDayDrawer
          open={drawerOpen}
          onOpenChange={open => !open && handleDrawerClose()}
          date={selectedDate}
          projects={projects}
          summary={dailySummaries.get(selectedDate)}
        />
      )}
    </div>
  )
}
