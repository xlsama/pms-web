import { useKeyPress } from 'ahooks'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Clock3, SearchIcon, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { UtStatus } from '@/api/ut'
import { Button } from '@/components/ui/button'
import { Command, CommandDialog, CommandGroup, CommandInput } from '@/components/ui/command'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Kbd } from '@/components/ui/kbd'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  type ProjectSearchEntry,
  type ProjectSearchItem,
  useYearlyProjectIndex,
} from '@/hooks/use-project-search'
import { cn } from '@/lib/utils'

const WEEKDAY_NARROW = ['日', '一', '二', '三', '四', '五', '六']

export function UtProjectSearch() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { year, projects, isPending } = useYearlyProjectIndex(open)

  useKeyPress(
    ['meta.k', 'ctrl.k'],
    e => {
      e.preventDefault()
      setOpen(o => !o)
    },
    { exactMatch: true },
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    )
  }, [projects, query])

  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="搜索项目">
          <SearchIcon className="size-4" />
        </Button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent
            className="h-[92vh] max-h-[92vh]"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <DrawerHeader className="text-left">
              <DrawerTitle>{year} 年项目搜索</DrawerTitle>
              <DrawerDescription>今年至今各项目的工时记录（按项目分组展示）</DrawerDescription>
            </DrawerHeader>
            <Command
              shouldFilter={false}
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none bg-transparent p-0"
            >
              <SearchBody
                query={query}
                onQueryChange={setQuery}
                isPending={isPending}
                projects={projects}
                filtered={filtered}
                autoFocus={false}
              />
            </Command>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-64 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">搜索项目...</span>
        <Kbd>⌘K</Kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        title={`${year} 年项目搜索`}
        description={`在 ${year} 年至今的工时记录中按项目分组展示`}
        className="top-1/2 -translate-y-1/2 sm:max-w-2xl"
      >
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-base font-semibold">{year} 年项目搜索</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            今年至今各项目的工时记录（按项目分组展示）
          </p>
        </div>
        <SearchBody
          query={query}
          onQueryChange={setQuery}
          isPending={isPending}
          projects={projects}
          filtered={filtered}
          listClassName="max-h-[70vh]"
        />
      </CommandDialog>
    </>
  )
}

function SearchBody({
  query,
  onQueryChange,
  isPending,
  projects,
  filtered,
  autoFocus,
  listClassName,
}: {
  query: string
  onQueryChange: (v: string) => void
  isPending: boolean
  projects: Array<ProjectSearchItem>
  filtered: Array<ProjectSearchItem>
  autoFocus?: boolean
  listClassName?: string
}) {
  const showLoading = isPending && projects.length === 0
  const showEmpty = !showLoading && filtered.length === 0
  const isPlaceholder = showLoading || showEmpty

  return (
    <>
      <div className="px-3">
        <CommandInput
          value={query}
          onValueChange={onQueryChange}
          placeholder="按项目名或编码搜索..."
          autoFocus={autoFocus}
        />
      </div>
      <div
        className={cn(
          'scroll-py-1 overflow-x-hidden overflow-y-auto outline-none',
          isPlaceholder && 'flex flex-col',
          listClassName ?? 'max-h-none flex-1',
        )}
      >
        {showLoading ? (
          <div className="m-auto py-6 text-center text-sm text-muted-foreground">加载中...</div>
        ) : showEmpty ? (
          <div className="m-auto py-6 text-center text-sm text-muted-foreground">
            {query ? '未找到匹配项目' : '今年暂无项目工时记录'}
          </div>
        ) : (
          filtered.map(project => <ProjectGroup key={project.id} project={project} />)
        )}
      </div>
    </>
  )
}

function ProjectGroup({ project }: { project: ProjectSearchItem }) {
  return (
    <CommandGroup
      heading={
        <div className="flex items-baseline justify-between gap-2 pr-1">
          <span className="min-w-0 truncate font-medium text-foreground">
            {project.name}
            {project.code ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {project.code}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {project.totalUt}d · {project.days.length} 天
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-1 px-2 pt-1 pb-2 sm:grid-cols-3">
        {project.days.map(day => (
          <DayChip key={day.date} day={day} />
        ))}
      </div>
    </CommandGroup>
  )
}

function DayChip({ day }: { day: ProjectSearchEntry }) {
  const d = parseISO(day.date)
  const md = format(d, 'M/d')
  const dow = WEEKDAY_NARROW[d.getDay()]

  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-1 text-xs">
      <span className="font-medium tabular-nums">{md}</span>
      <span className="text-muted-foreground">{dow}</span>
      <span className="ml-auto tabular-nums">{day.val}d</span>
      <StatusIcon status={day.status} />
    </div>
  )
}

function StatusIcon({ status }: { status: UtStatus }) {
  switch (status) {
    case UtStatus.Confirmed:
      return <CheckCircle2 className="size-3 shrink-0 text-green-600 dark:text-green-400" />
    case UtStatus.Check:
      return <Clock3 className="size-3 shrink-0 text-amber-500" />
    case UtStatus.Rejected:
      return <XCircle className="size-3 shrink-0 text-red-500" />
    default:
      return null
  }
}
