import { useDroppable } from '@dnd-kit/core'
import { useKeyPress } from 'ahooks'
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
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/use-ut'
import { getAdjustmentType, isFutureDate, isWorkday } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import { useUtStore } from '@/stores/ut'
import type { DailyData } from '@/types/ut'

import { UtProjectSearch } from '../search/ut-project-search'
import { UtDayCell } from './ut-day-cell'
import { UtDayPopover } from './ut-day-popover'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function UtCalendar() {
  const {
    currentDate,
    setCurrentDate,
    setFocusedDate,
    setFocusedDateOnly,
    selectedDate,
    setSelectedDate,
    setPrefilledProject,
    formOpen,
    setFormOpen,
    flashDate,
    flashNonce,
    setFlashDate,
    highlightUnfilled,
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

  // Compute calendar grid boundaries
  const { calendarStart, calendarEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return {
      calendarStart: startOfWeek(monthStart, { weekStartsOn: 1 }),
      calendarEnd: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    }
  }, [currentDate])

  const { dailyMap, projects } = useCalendarData(calendarStart, calendarEnd)

  const unfilledDates = useMemo(() => {
    if (!highlightUnfilled) return new Set<string>()
    const monthStart = startOfMonth(currentDate)
    const today = new Date()
    const monthEnd = endOfMonth(currentDate) > today ? today : endOfMonth(currentDate)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const set = new Set<string>()
    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd')
      if (!isWorkday(dateStr)) continue
      const d = dailyMap.get(dateStr)
      if (!d || d.totalUt < 1) set.add(dateStr)
    }
    return set
  }, [highlightUnfilled, currentDate, dailyMap])

  function navigateMonth(delta: number): void {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  useKeyPress(
    'leftarrow',
    e => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return
      if (formOpen) return
      navigateMonth(-1)
    },
    { exactMatch: true },
  )

  useKeyPress(
    'rightarrow',
    e => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return
      if (formOpen) return
      navigateMonth(1)
    },
    { exactMatch: true },
  )

  function goToToday(): void {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    setFocusedDate(todayStr)
    setFlashDate(todayStr)
  }

  // Build calendar days
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  function handleDayClick(date: string, element: HTMLElement): void {
    if (formOpen) {
      handlePopoverClose()
      return
    }
    setFocusedDateOnly(date)
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
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="text-xl font-medium">
            {format(currentDate, 'yyyy年M月', { locale: zhCN })}
          </h2>
        </div>
        <UtProjectSearch />
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
          const dailyData = dailyMap.get(dateStr)
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <DroppableDay
              key={dateStr}
              date={dateStr}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday(day)}
              isWeekend={isWeekend(day)}
              dailyData={dailyData}
              onClick={el => handleDayClick(dateStr, el)}
              isSelected={selectedDate === dateStr}
              isFlashing={flashDate === dateStr}
              flashNonce={flashNonce}
              onFlashEnd={handleFlashEnd}
              isUnfilled={unfilledDates.has(dateStr)}
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
          dailyData={dailyMap.get(selectedDate)}
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
  dailyData?: DailyData
  onClick: (element: HTMLElement) => void
  isSelected: boolean
  isFlashing: boolean
  flashNonce: number
  onFlashEnd: () => void
  isUnfilled: boolean
}

function DroppableDay({
  date,
  isCurrentMonth,
  isToday: today,
  isWeekend: weekend,
  dailyData,
  onClick,
  isSelected,
  isFlashing,
  flashNonce,
  onFlashEnd,
  isUnfilled,
}: DroppableDayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${date}`,
    data: {
      type: 'calendar-day',
      date,
    },
  })

  const adjustment = getAdjustmentType(date)
  const isRest = adjustment === 'rest'
  const isDisabled = isRest || isFutureDate(date)

  return (
    <div
      ref={setNodeRef}
      data-date={date}
      data-rest={isDisabled || undefined}
      className={cn(
        'relative isolate min-h-24 border-r border-b border-gray-200 p-1 transition-colors dark:border-gray-800',
        isDisabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer',
        !isDisabled && weekend && 'bg-muted/20',
        isOver && !isDisabled && 'bg-primary/10 ring-1 ring-gray-300 ring-inset',
        isSelected && 'ring-1 ring-gray-300 ring-inset',
        !isDisabled && isUnfilled && 'bg-orange-50/60 dark:bg-orange-500/10',
      )}
      onClick={isDisabled ? undefined : e => onClick(e.currentTarget)}
    >
      {isFlashing && (
        <span
          key={flashNonce}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 animate-flash"
          onAnimationEnd={onFlashEnd}
        />
      )}
      <div className="relative z-10 h-full">
        <UtDayCell
          date={date}
          isCurrentMonth={isCurrentMonth}
          isToday={today}
          dailyData={dailyData}
        />
      </div>
    </div>
  )
}
