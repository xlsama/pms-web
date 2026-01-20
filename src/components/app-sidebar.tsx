import { useState } from 'react'
import { Boxes, ChevronsUpDown, KeyRound, LogOut } from 'lucide-react'
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ChangePwdDialog } from '@/components/change-pwd-dialog'

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
        <SidebarMenuButton asChild className="h-auto">
          <Link to="/">
            <img src="/logo.png" className="mx-auto w-1/2" />
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/ut-tmp">
                    <Boxes />
                    <span>UT模板</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
