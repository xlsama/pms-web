import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  isWeekend,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useCalendarData } from '@/hooks/use-ut'
import { useUtStore } from '@/stores/ut'

import { UtDayCard } from './ut-day-card'
import { UtDayDrawer } from './ut-day-drawer'

export function UtWeekView() {
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate } = useUtStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { dailyMap, projects } = useCalendarData(weekStart, weekEnd)

  function navigateWeek(delta: number): void {
    const newDate = delta > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1)
    setCurrentDate(newDate)
  }

  function goToToday(): void {
    setCurrentDate(new Date())
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void {
    const threshold = 50
    const velocity = 500

    if (info.offset.x > threshold || info.velocity.x > velocity) {
      navigateWeek(-1)
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      navigateWeek(1)
    }
  }

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
      <div className="sticky top-13.25 z-10 bg-background px-4 py-4">
        <div className="rounded-lg bg-muted/50 p-3">
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

            {/* Right: Today button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-3 text-sm"
              onClick={goToToday}
            >
              本周
            </Button>
          </div>
        </div>
      </div>

      {/* Day cards */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="flex-1 space-y-2 overflow-auto px-4 pb-4"
      >
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dailyData = dailyMap.get(dateStr)

          return (
            <UtDayCard
              key={dateStr}
              date={dateStr}
              isToday={isToday(day)}
              isWeekend={isWeekend(day)}
              dailyData={dailyData}
              onClick={() => handleDayClick(dateStr)}
            />
          )
        })}
      </motion.div>

      {/* Drawer */}
      {selectedDate && (
        <UtDayDrawer
          open={drawerOpen}
          onOpenChange={open => !open && handleDrawerClose()}
          date={selectedDate}
          projects={projects}
          dailyData={dailyMap.get(selectedDate)}
        />
      )}
    </div>
  )
}
