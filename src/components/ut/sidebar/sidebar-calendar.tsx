import { zhCN } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { useUtStore } from '@/stores/ut'

export function SidebarCalendar() {
  const { currentDate, setCurrentDate } = useUtStore()

  return (
    <Calendar
      mode="single"
      locale={zhCN}
      weekStartsOn={1}
      selected={currentDate}
      onSelect={date => date && setCurrentDate(date)}
      className="rounded-md border"
    />
  )
}
