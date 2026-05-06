import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'

import { ChangePwdDialog } from '@/components/change-pwd-dialog'
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
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { SidebarCalendar } from '@/components/ut/sidebar/sidebar-calendar'
import { SidebarProjects } from '@/components/ut/sidebar/sidebar-projects'
import { useAuthStore } from '@/stores/auth'

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
          <img src="/logo.svg" alt="PMS" className="mx-auto w-1/2" />
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
            <span className="ml-1 text-muted-foreground opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
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
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="h-auto">
                <Avatar className="size-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold">{user?.name ?? '未登录'}</span>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="top" align="start" className="w-(--anchor-width)">
            <DropdownMenuGroup>
              <DropdownMenuLabel>设置</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setChangePwdOpen(true)}>
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
