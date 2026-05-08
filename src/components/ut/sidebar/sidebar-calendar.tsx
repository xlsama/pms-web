import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Calendar } from '@/components/ui/calendar'
import { useUtStore } from '@/stores/ut'

export function SidebarCalendar() {
  const { currentDate, setCurrentDate, focusedDate, setFocusedDate, setFlashDate } = useUtStore()

  return (
    <Calendar
      mode="single"
      required
      locale={zhCN}
      weekStartsOn={1}
      month={currentDate}
      onMonthChange={setCurrentDate}
      selected={parseISO(focusedDate)}
      onSelect={date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        setFocusedDate(dateStr)
        setFlashDate(dateStr)
      }}
      className="rounded-md border [--cell-size:--spacing(9)]"
      classNames={{ root: 'w-full' }}
    />
  )
}
