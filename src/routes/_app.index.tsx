import { createFileRoute } from '@tanstack/react-router'
import { useIsMobile } from '@/hooks/use-mobile'
import { UtCalendar } from '@/components/ut/calendar/ut-calendar'
import { UtWeekView } from '@/components/ut/mobile/ut-week-view'

export const Route = createFileRoute('/_app/')({
  component: RouteComponent,
})

function RouteComponent() {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full min-h-0 flex-col">{isMobile ? <UtWeekView /> : <UtCalendar />}</div>
  )
}
