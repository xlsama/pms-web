import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Menu, Moon, Sun } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/theme-provider'

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
  const { setTheme } = useTheme()
  const navigate = useNavigate()

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
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-sidebar px-4 py-2">
            <div className="flex shrink-0 items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              {data && (
                <div className="flex items-center gap-1.5">
                  <Badge className="border-transparent bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    剩余:
                    <span className="ml-0.5 font-semibold tabular-nums">
                      {data.totalManDaysRemaining}
                    </span>
                  </Badge>
                  {data.checkCount > 0 && (
                    <Badge className="border-transparent bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                      待审:
                      <span className="ml-0.5 font-semibold tabular-nums">{data.checkCount}</span>
                    </Badge>
                  )}
                  {data.rejectedCount > 0 && (
                    <Badge className="border-transparent bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/50 dark:text-red-300">
                      驳回:
                      <span className="ml-0.5 font-semibold tabular-nums">
                        {data.rejectedCount}
                      </span>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Desktop: show buttons */}
            <div className="hidden items-center md:flex">
              <Button variant="link">
                <Link to="/ut-tmp">UT模板</Link>
              </Button>
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <ModeToggle />
            </div>

            {/* Mobile: dropdown menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="size-4" />
                    <span className="sr-only">菜单</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate({ to: '/ut-tmp' })}>
                    UT模板
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                      <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                      <span className="ml-2">主题</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme('light')}>浅色</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>深色</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>
                        跟随系统
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
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
