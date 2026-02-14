import { format, isSameMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Calendar } from '@/components/ui/calendar'
import { useUtStore } from '@/stores/ut'

export function SidebarCalendar() {
  const { currentDate, setCurrentDate, setFlashDate } = useUtStore()
  const today = new Date()

  return (
    <Calendar
      mode="single"
      locale={zhCN}
      weekStartsOn={1}
      month={currentDate}
      onMonthChange={setCurrentDate}
      selected={isSameMonth(currentDate, today) ? today : undefined}
      onSelect={date => {
        if (date) {
          setCurrentDate(date)
          setFlashDate(format(date, 'yyyy-MM-dd'))
        }
      }}
      className="rounded-md border"
    />
  )
}
