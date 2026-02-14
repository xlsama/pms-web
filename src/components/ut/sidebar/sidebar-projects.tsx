import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { useMemo } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { useCalendarData } from '@/hooks/use-ut'
import { isLeaveProject } from '@/lib/ut-utils'
import { useUtStore } from '@/stores/ut'

import { DraggableProject } from '../dnd/draggable-project'

export function SidebarProjects() {
  const { currentDate } = useUtStore()
  const monthRange = useMemo(
    () => ({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    }),
    [currentDate],
  )
  const { projects, isPending } = useCalendarData(monthRange.start, monthRange.end)

  const { regularProjects, leaveProjects } = useMemo(() => {
    const regular: typeof projects = []
    const leave: typeof projects = []
    for (const p of projects) {
      if (isLeaveProject(p.name)) {
        leave.push(p)
      } else {
        regular.push(p)
      }
    }
    return { regularProjects: regular, leaveProjects: leave }
  }, [projects])

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (projects.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">暂无项目</p>
  }

  return (
    <div className="space-y-2">
      {regularProjects.map(project => (
        <DraggableProject key={project.id} project={project} />
      ))}

      {leaveProjects.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="leave" className="border-none">
            <AccordionTrigger className="px-2 py-2 text-xs text-muted-foreground hover:no-underline">
              请假项目
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="space-y-2">
                {leaveProjects.map(project => (
                  <DraggableProject key={project.id} project={project} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}
