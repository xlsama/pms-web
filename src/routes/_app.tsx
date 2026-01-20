import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import type { Project } from '@/types/ut'
import { useAuthStore } from '@/stores/auth'
import { useUtStore } from '@/stores/ut'
import { useMonthlyUt } from '@/hooks/use-ut'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ModeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { UtDndProvider } from '@/components/ut/dnd/dnd-provider'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (!token) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const { currentDate, setSelectedDate, setPrefilledProject, setFormOpen } = useUtStore()
  const { data } = useMonthlyUt(currentDate.getFullYear(), currentDate.getMonth() + 1)

  const handleDrop = (project: Project, date: string) => {
    setSelectedDate(date)
    setPrefilledProject(project)
    setFormOpen(true)
  }

  return (
    <UtDndProvider onDrop={handleDrop}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
            <div className="flex shrink-0 items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              {data && (
                <div className="flex items-center gap-2">
                  <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    剩余总人天: {data.totalManDaysRemaining}
                  </Badge>
                  {data.checkCount > 0 && (
                    <Badge className="border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                      待审批: {data.checkCount}
                    </Badge>
                  )}
                  {data.rejectedCount > 0 && (
                    <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                      已驳回: {data.rejectedCount}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center">
              <Button variant="link">
                <Link to="/ut-tmp">UT模板</Link>
              </Button>
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <ModeToggle />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UtDndProvider>
  )
}
