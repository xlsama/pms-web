import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/theme-provider'

type Theme = 'light' | 'dark' | 'system'

function getOrigin(e: React.MouseEvent) {
  if (e.clientX === 0 && e.clientY === 0) return undefined
  return { x: e.clientX, y: e.clientY }
}

export function ModeToggle() {
  const { setTheme } = useTheme()

  const pick = (t: Theme) => (e: React.MouseEvent) => setTheme(t, getOrigin(e))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">切换主题</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={pick('light')}>浅色</DropdownMenuItem>
        <DropdownMenuItem onClick={pick('dark')}>深色</DropdownMenuItem>
        <DropdownMenuItem onClick={pick('system')}>跟随系统</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
