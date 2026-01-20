import { useState, useMemo } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
  isWeekend,
  getWeek,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UtDayCard } from './ut-day-card'
import { UtDayDrawer } from './ut-day-drawer'
import { useMonthlyUt } from '@/hooks/use-ut'
import { useUtStore } from '@/stores/ut'
import { UtStatus } from '@/types/ut'
import type { Project, UtAllocation, DailyUtSummary } from '@/types/ut'

export function UtWeekView() {
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate } = useUtStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 })

  const { data } = useMonthlyUt(currentDate.getFullYear(), currentDate.getMonth() + 1)

  // Navigate weeks
  const navigateWeek = (delta: number) => {
    const newDate = delta > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Build daily summaries map
  const dailySummaries = useMemo(() => {
    const map = new Map<string, DailyUtSummary>()

    if (data?.list) {
      const byDate = new Map<string, UtAllocation[]>()

      for (const item of data.list) {
        if (item.date) {
          const existing = byDate.get(item.date) || []
          existing.push({
            id: item.id,
            date: item.date,
            projectId: item.projectId,
            projectName: item.projectName,
            value: item.val,
            status: item.status,
          })
          byDate.set(item.date, existing)
        }
      }

      for (const [date, allocations] of byDate) {
        const totalUt = allocations.reduce((sum, a) => sum + a.value, 0)
        const status = allocations[0]?.status || UtStatus.None
        const editable = status !== UtStatus.Confirmed

        map.set(date, {
          date,
          isWorkday: !isWeekend(new Date(date)),
          allocations,
          totalUt,
          status,
          editable,
        })
      }
    }

    return map
  }, [data])

  // Extract projects
  const projects: Project[] = useMemo(() => {
    if (!data?.list) return []

    const projectMap = new Map<number, Project>()

    for (const item of data.list) {
      if (item.projectId && !projectMap.has(item.projectId)) {
        projectMap.set(item.projectId, {
          id: item.projectId,
          name: item.projectName,
          code: item.projectCode || '',
          manDaysRemaining: item.manDaysRemaining,
          manDaysUsed: item.manDaysUsed,
          totalManDays: item.totalManDays,
        })
      }
    }

    return Array.from(projectMap.values())
  }, [data])

  // Handle day click
  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedDate(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-center">
            <div className="text-sm font-medium">
              {format(weekStart, 'M月d日', { locale: zhCN })} -{' '}
              {format(weekEnd, 'M月d日', { locale: zhCN })}
            </div>
            <div className="text-xs text-muted-foreground">第 {weekNumber} 周</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          本周
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="flex items-center justify-center gap-3 border-b px-4 py-2 text-xs">
          <span>
            剩余: <strong>{data.totalManDaysRemaining}</strong>
          </span>
          {data.uncommittedCount.length > 0 && (
            <span className="text-yellow-600">
              未提交: <strong>{data.uncommittedCount.length}</strong>
            </span>
          )}
          {data.checkCount > 0 && (
            <span className="text-blue-600">
              待审: <strong>{data.checkCount}</strong>
            </span>
          )}
        </div>
      )}

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
