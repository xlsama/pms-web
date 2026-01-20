import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/theme-toggle'

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
  const { pathname } = window.location

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <div className="flex shrink-0 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>{pathname.replace('/', '')}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <ModeToggle />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
