import { useState } from 'react'
import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { ChangePwdDialog } from '@/components/change-pwd-dialog'
import { SidebarCalendar } from '@/components/ut/sidebar/sidebar-calendar'
import { SidebarProjects } from '@/components/ut/sidebar/sidebar-projects'

export function AppSidebar() {
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const [changePwdOpen, setChangePwdOpen] = useState(false)

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link to="/">
          <img src="/logo.png" className="mx-auto w-1/2" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarCalendar />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>
            项目
            <span className="ml-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              （拖拽到日历）
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarProjects />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto">
              <Avatar className="size-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-white">
                  {user?.name.charAt(0) ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{user?.name ?? '未登录'}</span>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            <DropdownMenuLabel>设置</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setChangePwdOpen(true)}>
                <KeyRound />
                修改密码
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChangePwdDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />
      </SidebarFooter>
    </Sidebar>
  )
}
