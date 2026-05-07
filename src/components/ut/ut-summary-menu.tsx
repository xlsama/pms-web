import { format, startOfYear } from 'date-fns'
import { Copy, Download, Monitor, MoonStar, MoreHorizontal, Palette, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/theme-provider'
import { useUtSummary } from '@/hooks/use-ut-summary'
import { copyToClipboard } from '@/lib/clipboard'
import { downloadTextFile } from '@/lib/download'
import { buildUtSummaryMarkdown } from '@/lib/ut-summary-markdown'
import { parseEntryDate } from '@/lib/ut-utils'
import { useAuthStore } from '@/stores/auth'

type RangeKey = 'year' | 'all'
type ActionKey = 'copy' | 'download'
type Theme = 'light' | 'dark' | 'system'

function getThemeOrigin(e: React.MouseEvent) {
  if (e.clientX === 0 && e.clientY === 0) return undefined
  return { x: e.clientX, y: e.clientY }
}

interface PendingTask {
  range: RangeKey
  action: ActionKey
}

const TOAST_ID = 'ut-summary'

const RANGE_LABEL: Record<RangeKey, string> = {
  year: '本年',
  all: '入职以来',
}

export function UtSummaryMenu() {
  const user = useAuthStore(state => state.user)
  const { setTheme } = useTheme()
  const [pending, setPending] = useState<PendingTask | null>(null)

  const pickTheme = (t: Theme) => (e: React.MouseEvent) => setTheme(t, getThemeOrigin(e))

  const entryDate = useMemo(() => parseEntryDate(user?.entryTime), [user?.entryTime])
  const yearStartStr = useMemo(() => format(startOfYear(new Date()), 'yyyy-MM-dd'), [])
  const entryDateStr = useMemo(
    () => (entryDate ? format(entryDate, 'yyyy-MM-dd') : null),
    [entryDate],
  )

  const range = useMemo(() => {
    const today = new Date()
    if (pending?.range === 'all' && entryDate) {
      return { start: entryDate, end: today }
    }
    return { start: startOfYear(today), end: today }
  }, [pending, entryDate])

  const data = useUtSummary({
    start: range.start,
    end: range.end,
    enabled: pending !== null,
  })

  useEffect(() => {
    if (!pending) return

    if (data.isError) {
      toast.error('加载 UT 数据失败，请稍后重试', { id: TOAST_ID })
      setPending(null)
      return
    }

    if (data.isPending) return

    const meta = {
      rangeLabel: RANGE_LABEL[pending.range],
      userName: user?.name,
    }
    const markdown = buildUtSummaryMarkdown(data, meta)

    const finish = (action: ActionKey) => {
      if (action === 'copy') {
        copyToClipboard(markdown)
          .then(() => toast.success('UT 总结已复制到剪贴板', { id: TOAST_ID }))
          .catch(() => toast.error('复制失败，请手动复制', { id: TOAST_ID }))
      } else {
        const filename =
          pending.range === 'year'
            ? `ut-summary-${new Date().getFullYear()}.md`
            : `ut-summary-since-${entryDateStr ?? 'unknown'}.md`
        try {
          downloadTextFile(filename, markdown)
          toast.success(`已下载 ${filename}`, { id: TOAST_ID })
        } catch {
          toast.error('下载失败', { id: TOAST_ID })
        }
      }
    }

    finish(pending.action)
    setPending(null)
  }, [pending, data, user?.name, entryDateStr])

  const trigger = (range: RangeKey, action: ActionKey) => () => {
    toast.loading('正在收集 UT 数据…', { id: TOAST_ID })
    setPending({ range, action })
  }

  const allDisabled = !entryDate
  const allHint = entryDateStr ? `${entryDateStr} 起` : '未获取到入职时间'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="更多操作">
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Copy />
              复制 UT 总结
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-52">
              <DropdownMenuItem onClick={trigger('year', 'copy')}>
                <span className="flex-1">今年</span>
                <span className="ml-2 text-xs text-muted-foreground">{yearStartStr} 起</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={trigger('all', 'copy')} disabled={allDisabled}>
                <span className="flex-1">入职以来</span>
                <span className="ml-2 text-xs text-muted-foreground">{allHint}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Download />
              下载为 Markdown
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-52">
              <DropdownMenuItem onClick={trigger('year', 'download')}>
                <span className="flex-1">今年</span>
                <span className="ml-2 text-xs text-muted-foreground">{yearStartStr} 起</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={trigger('all', 'download')} disabled={allDisabled}>
                <span className="flex-1">入职以来</span>
                <span className="ml-2 text-xs text-muted-foreground">{allHint}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            主题
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-32">
            <DropdownMenuItem onClick={pickTheme('light')}>
              <Sun />
              浅色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={pickTheme('dark')}>
              <MoonStar />
              深色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={pickTheme('system')}>
              <Monitor />
              跟随系统
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
