import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UtDayCell } from './ut-day-cell'
import { UtDayPopover } from './ut-day-popover'
import type { DailyUtSummary } from '@/types/ut'
import { Button } from '@/components/ui/button'
import { useMonthlyUt } from '@/hooks/use-ut'
import { buildDailySummaries, extractProjects } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import { useUtStore } from '@/stores/ut'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function UtCalendar() {
  const {
    currentDate,
    setCurrentDate,
    setSidebarMonth,
    selectedDate,
    setSelectedDate,
    setPrefilledProject,
    setProjects,
    formOpen,
    setFormOpen,
    flashDate,
    setFlashDate,
  } = useUtStore()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // Sync formOpen from drag-drop to local popover state
  useEffect(() => {
    if (formOpen && selectedDate && !anchorEl) {
      // Find the day cell element for the selected date
      const dayCell = document.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`)
      if (dayCell) {
        setAnchorEl(dayCell)
      }
    }
  }, [formOpen, selectedDate, anchorEl])

  const { data } = useMonthlyUt(currentDate.getFullYear(), currentDate.getMonth() + 1)

  function navigateMonth(delta: number): void {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
    setSidebarMonth(newDate)
  }

  function goToToday(): void {
    const today = new Date()
    setCurrentDate(today)
    setSidebarMonth(today)
    setFlashDate(format(today, 'yyyy-MM-dd'))
  }

  // Build calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Build daily summaries map
  const dailySummaries = useMemo(() => buildDailySummaries(data?.list), [data])

  // Extract projects from data
  const projects = useMemo(() => extractProjects(data?.list), [data])

  // Sync projects to store
  useEffect(() => {
    setProjects(projects)
  }, [projects, setProjects])

  function handleDayClick(date: string, element: HTMLElement): void {
    setSelectedDate(date)
    setPrefilledProject(null)
    setAnchorEl(element)
    setFormOpen(true)
  }

  function handlePopoverClose(): void {
    setFormOpen(false)
    setSelectedDate(null)
    setPrefilledProject(null)
    setAnchorEl(null)
  }

  const handleFlashEnd = useCallback(() => {
    setFlashDate(null)
  }, [setFlashDate])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-medium">
            {format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-sm font-medium',
              i >= 5 && 'text-muted-foreground',
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{
          gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, minmax(0, 1fr))`,
        }}
      >
        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const summary = dailySummaries.get(dateStr)
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <DroppableDay
              key={dateStr}
              date={dateStr}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday(day)}
              isWeekend={isWeekend(day)}
              summary={summary}
              onClick={el => handleDayClick(dateStr, el)}
              isSelected={selectedDate === dateStr}
              isFlashing={flashDate === dateStr}
              onFlashEnd={handleFlashEnd}
            />
          )
        })}
      </div>

      {/* Popover for editing */}
      {selectedDate && (
        <UtDayPopover
          open={formOpen}
          onOpenChange={open => !open && handlePopoverClose()}
          date={selectedDate}
          projects={projects}
          summary={dailySummaries.get(selectedDate)}
          anchorEl={anchorEl}
        />
      )}
    </div>
  )
}

interface DroppableDayProps {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  summary?: DailyUtSummary
  onClick: (element: HTMLElement) => void
  isSelected: boolean
  isFlashing: boolean
  onFlashEnd: () => void
}

function DroppableDay({
  date,
  isCurrentMonth,
  isToday: today,
  isWeekend: weekend,
  summary,
  onClick,
  isSelected,
  isFlashing,
  onFlashEnd,
}: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${date}`,
    data: {
      type: 'calendar-day',
      date,
    },
  })

  useEffect(() => {
    if (isFlashing) {
      const timer = setTimeout(() => {
        onFlashEnd()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isFlashing, onFlashEnd])

  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn(
        'min-h-24 cursor-pointer border-b border-r border-gray-200 p-1 transition-colors dark:border-gray-800',
        !isCurrentMonth && 'bg-muted/30',
        weekend && 'bg-muted/20',
        isOver && 'bg-primary/10 ring-1 ring-inset ring-gray-300',
        isSelected && 'ring-1 ring-inset ring-gray-300',
        isFlashing && 'animate-flash',
      )}
      onClick={e => onClick(e.currentTarget)}
    >
      <UtDayCell date={date} isCurrentMonth={isCurrentMonth} isToday={today} summary={summary} />
    </div>
  )
}
