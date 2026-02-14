import { format, isSameMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Calendar } from '@/components/ui/calendar'
import { useUtStore } from '@/stores/ut'

export function SidebarCalendar() {
  const { setCurrentDate, sidebarMonth, setSidebarMonth, setFlashDate } = useUtStore()
  const today = new Date()

  return (
    <Calendar
      mode="single"
      locale={zhCN}
      weekStartsOn={1}
      month={sidebarMonth}
      onMonthChange={setSidebarMonth}
      selected={isSameMonth(sidebarMonth, today) ? today : undefined}
      onSelect={date => {
        if (date) {
          setCurrentDate(date)
          setSidebarMonth(date)
          setFlashDate(format(date, 'yyyy-MM-dd'))
        }
      }}
      className="rounded-md border"
    />
  )
}
