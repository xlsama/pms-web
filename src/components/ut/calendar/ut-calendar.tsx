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
import { getAdjustmentType } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import { useUtStore } from '@/stores/ut'
import type { DailyData } from '@/types/ut'

import { UtDayCell } from './ut-day-cell'
import { UtDayPopover } from './ut-day-popover'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export function UtCalendar() {
  const {
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    setPrefilledProject,
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
    const today = new Date()
    setCurrentDate(today)
    setFlashDate(format(today, 'yyyy-MM-dd'))
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
  onFlashEnd: () => void
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

  const adjustment = getAdjustmentType(date)
  const isRest = adjustment === 'rest'

  return (
    <div
      ref={setNodeRef}
      data-date={date}
      data-rest={isRest || undefined}
      className={cn(
        'min-h-24 border-b border-r border-gray-200 p-1 transition-colors dark:border-gray-800',
        isRest ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer',
        !isRest && !isCurrentMonth && 'bg-muted/30',
        !isRest && weekend && 'bg-muted/20',
        isOver && 'bg-primary/10 ring-1 ring-inset ring-gray-300',
        isSelected && 'ring-1 ring-inset ring-gray-300',
        isFlashing && 'animate-flash',
      )}
      onClick={isRest ? undefined : e => onClick(e.currentTarget)}
    >
      <UtDayCell
        date={date}
        isCurrentMonth={isCurrentMonth}
        isToday={today}
        dailyData={dailyData}
      />
    </div>
  )
}
