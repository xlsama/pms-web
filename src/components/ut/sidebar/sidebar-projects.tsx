import { useMonthlyUt } from '@/hooks/use-ut'
import { useUtStore } from '@/stores/ut'
import { DraggableProject } from '../dnd/draggable-project'
import { Skeleton } from '@/components/ui/skeleton'
import type { Project } from '@/types/ut'

export function SidebarProjects() {
  const { currentDate } = useUtStore()
  const { data, isLoading } = useMonthlyUt(currentDate.getFullYear(), currentDate.getMonth() + 1)

  // Transform UtItem list to Project[]
  const projects: Project[] =
    data?.list
      ?.filter(item => item.projectId && !item.hasChildren)
      ?.reduce((acc, item) => {
        const existing = acc.find(p => p.id === item.projectId)
        if (!existing) {
          acc.push({
            id: item.projectId,
            name: item.projectName,
            code: item.projectCode || '',
            manDaysRemaining: item.manDaysRemaining,
            manDaysUsed: item.manDaysUsed,
            totalManDays: item.totalManDays,
          })
        }
        return acc
      }, [] as Project[]) || []

  if (isLoading) {
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
      {projects.map(project => (
        <DraggableProject key={project.id} project={project} />
      ))}
    </div>
  )
}
