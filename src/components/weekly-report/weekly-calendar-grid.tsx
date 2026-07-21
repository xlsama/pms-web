import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { format, isToday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  CalendarPlus,
  ChartNoAxesColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'

import { ribbonColor, ribbonVars } from './weekly-palette'
import type { RibbonColor } from './weekly-palette'

export interface WeeklyCalendarProject {
  projectId: number
  projectName: string
  projectCode: string | null
  planContent: string | null
  days: Array<{ workDate: string; assigned: boolean; workday: boolean }>
}

interface WeekDay {
  workDate: string
  workday: boolean
}

interface AssignmentSegment {
  project: WeeklyCalendarProject
  color: RibbonColor
  dates: Array<string>
  startIndex: number
  endIndex: number
  row: number
  /** 同一项目内的第几段，>0 显示「续」标记 */
  segIndex: number
}

interface ActiveDrag {
  segment: AssignmentSegment
  kind: 'move' | 'resize'
  edge?: 'start' | 'end'
}

interface DragPreview {
  start: number
  end: number
  valid: boolean
  reason?: string
}

/**
 * 落点判定跟随鼠标指针：指针进入哪一列就命中哪一列。
 * 默认的矩形相交算法要求拖动元素与目标列重叠面积最大才切换，
 * 手柄刚跨过列边界时不生效，体感是「要拖到列中间才算」。
 */
const pointerFirstCollision: CollisionDetection = args => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

interface WeeklyCalendarGridProps {
  projects: Array<WeeklyCalendarProject>
  weekDays: Array<WeekDay>
  editable: boolean
  selectedProjectId?: number | null
  onAddProject: (workDate: string) => void
  onOpenProject: (projectId: number) => void
  onViewProject: (projectId: number) => void
  onMoveSegment: (projectId: number, dates: Array<string>, targetDate: string) => void
  onResizeSegment: (
    projectId: number,
    dates: Array<string>,
    targetDate: string,
    edge: 'start' | 'end',
  ) => void
  onNavigateWeek: (delta: number) => void
}

export function WeeklyCalendarGrid({
  projects,
  weekDays,
  editable,
  selectedProjectId,
  onAddProject,
  onOpenProject,
  onViewProject,
  onMoveSegment,
  onResizeSegment,
  onNavigateWeek,
}: WeeklyCalendarGridProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  )
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [overDate, setOverDate] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeState = useRef<{
    pointerId: number
    startX: number
    moved: boolean
    captured: boolean
  } | null>(null)
  const suppressClick = useRef(false)

  const segments = useMemo(() => buildSegments(projects, weekDays), [projects, weekDays])
  const rows = projects.length
  const isEmpty = rows === 0

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'weekly-assignment') {
      setActiveDrag({ segment: data.segment as AssignmentSegment, kind: 'move' })
    } else if (data?.type === 'weekly-resize') {
      setActiveDrag({
        segment: data.segment as AssignmentSegment,
        kind: 'resize',
        edge: data.edge as 'start' | 'end',
      })
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const over = event.over?.data.current
    setOverDate(over?.type === 'weekly-day' ? (over.workDate as string) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const segment = event.active.data.current?.segment as AssignmentSegment | undefined
    if (segment && event.over?.data.current?.type === 'weekly-day') {
      if (event.active.data.current?.type === 'weekly-assignment') {
        onMoveSegment(segment.project.projectId, segment.dates, event.over.data.current.workDate)
      } else if (event.active.data.current?.type === 'weekly-resize') {
        onResizeSegment(
          segment.project.projectId,
          segment.dates,
          event.over.data.current.workDate,
          event.active.data.current.edge,
        )
      }
    }
    setActiveDrag(null)
    setOverDate(null)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    // portal 浮层（如右键菜单）的事件会沿 React 树冒泡到这里，但其 DOM 不在画布内，
    // 若在此启动翻周手势会 setPointerCapture 抢走指针、导致浮层内点击失效
    if (!event.currentTarget.contains(target)) return
    if (target.closest('[data-weekly-interactive]')) return
    // 只记录起点，先不捕获指针：纯点击要留给日格的 onClick（添加项目）。
    // 立即 setPointerCapture 会让浏览器合成的 click 落不到日格上。
    swipeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
      captured: false,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = swipeState.current
    if (!state || state.pointerId !== event.pointerId) return
    const delta = event.clientX - state.startX
    // 移动超阈值才确认为拖动，此时才捕获指针进入翻周手势；阈值内视为点击、不干预
    if (!state.captured) {
      if (Math.abs(delta) <= 6) return
      state.moved = true
      state.captured = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setSwipeOffset(Math.max(-180, Math.min(180, delta)))
  }

  function finishSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    const state = swipeState.current
    if (!state || state.pointerId !== event.pointerId) return
    const delta = event.clientX - state.startX
    if (state.moved) {
      suppressClick.current = true
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }
    if (Math.abs(delta) >= 90) onNavigateWeek(delta < 0 ? 1 : -1)
    swipeState.current = null
    setSwipeOffset(0)
  }

  function addProject(workDate: string) {
    if (!suppressClick.current) onAddProject(workDate)
  }

  const activeVars = activeDrag ? ribbonVars(activeDrag.segment.color) : undefined
  // 拖动中的落点预览：松手后段将覆盖的日期范围与合法性
  const preview = useMemo(
    () => (activeDrag && overDate ? buildDragPreview(activeDrag, overDate, weekDays) : null),
    [activeDrag, overDate, weekDays],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerFirstCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDrag(null)
        setOverDate(null)
      }}
    >
      {/* 桌面 / 平板：横向甘特画布，撑满容器剩余高度。圆角/边框/阴影由外层 wrap 提供，
          好让详情面板打开时能与日历拼成一体分栏，中缝只留面板的 border-l。 */}
      <div className="relative hidden overflow-hidden bg-background sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
        <div
          className={cn(
            'flex flex-1 cursor-grab flex-col select-none active:cursor-grabbing',
            swipeOffset === 0 && 'transition-transform duration-200',
          )}
          style={{
            minWidth: 560,
            transform: `translate3d(${swipeOffset}px, 0, 0)`,
            touchAction: 'pan-y',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishSwipe}
          onPointerCancel={finishSwipe}
        >
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map(day => (
              <DayHeaderCell key={day.workDate} day={day} />
            ))}
          </div>

          {isEmpty ? (
            <EmptyCanvas editable={editable} onAdd={() => addProject(defaultAddDate(weekDays))} />
          ) : (
            <div
              className="relative grid flex-1 grid-cols-7 py-1.5"
              style={{ gridTemplateRows: `repeat(${rows}, 56px) 1fr` }}
            >
              {weekDays.map((day, index) => (
                <DayColumn
                  key={day.workDate}
                  day={day}
                  columnIndex={index}
                  editable={editable}
                  dragging={activeDrag !== null}
                  onAddProject={() => addProject(day.workDate)}
                />
              ))}

              {segments.map(segment => (
                <AssignmentRibbon
                  key={`${segment.project.projectId}-${segment.dates[0]}`}
                  segment={segment}
                  editable={editable}
                  selected={segment.project.projectId === selectedProjectId}
                  onOpen={() =>
                    editable
                      ? onOpenProject(segment.project.projectId)
                      : onViewProject(segment.project.projectId)
                  }
                  onView={() => onViewProject(segment.project.projectId)}
                />
              ))}

              {/* 拖动落点预览：在被拖项目所在行渲染幽灵占位框，示意松手后的覆盖范围 */}
              {preview && activeDrag ? (
                <div
                  aria-hidden
                  className={cn(
                    'pointer-events-none z-10 m-1 rounded-[9px] border-[1.5px] border-dashed',
                    preview.valid
                      ? 'border-(--rb-key)/55 bg-(--rb-key)/10 dark:border-(--rb-key-d)/55 dark:bg-(--rb-key-d)/12'
                      : 'border-destructive/50 bg-destructive/10 dark:bg-destructive/15',
                  )}
                  style={{
                    gridColumn: `${preview.start + 1} / ${preview.end + 2}`,
                    gridRow: activeDrag.segment.row + 1,
                    ...activeVars,
                  }}
                />
              ) : null}
            </div>
          )}
        </div>

        {editable && !isEmpty ? (
          <button
            type="button"
            data-weekly-interactive
            className="mx-2 mb-2 flex h-10 w-[calc(100%-16px)] items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed text-[13px] font-semibold text-muted-foreground transition-colors hover:border-gantt hover:bg-gantt/5 hover:text-gantt"
            onClick={() => addProject(defaultAddDate(weekDays))}
          >
            <Plus className="size-4" />
            添加项目到本周
          </button>
        ) : null}

        {/* 翻周提示：拖动画布时才显现 */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-28 items-center justify-start pl-3 transition-opacity"
          style={{
            opacity: Math.max(0, Math.min(1, swipeOffset / 60)),
            background:
              'linear-gradient(90deg, color-mix(in oklab, var(--gantt) 14%, transparent), transparent)',
          }}
        >
          <span className="flex h-[34px] items-center gap-1.5 rounded-full border border-gantt/25 bg-background pr-3.5 pl-2.5 text-xs font-semibold text-gantt shadow-lg">
            <ChevronLeft className="size-4" />
            上一周
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-28 items-center justify-end pr-3 transition-opacity"
          style={{
            opacity: Math.max(0, Math.min(1, -swipeOffset / 60)),
            background:
              'linear-gradient(270deg, color-mix(in oklab, var(--gantt) 14%, transparent), transparent)',
          }}
        >
          <span className="flex h-[34px] items-center gap-1.5 rounded-full border border-gantt/25 bg-background pr-2.5 pl-3.5 text-xs font-semibold text-gantt shadow-lg">
            下一周
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

      {/* 手机：按天分组纵向列表（不做拖拽，改期走项目弹窗勾选日期） */}
      <MobileDayList
        projects={projects}
        weekDays={weekDays}
        editable={editable}
        onAddProject={addProject}
        onOpenProject={onOpenProject}
        onViewProject={onViewProject}
      />

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="flex h-[30px] w-max items-center gap-2 rounded-lg bg-[#171A20] px-3 text-xs font-semibold text-white shadow-xl">
            <span
              className="size-2 rounded-[2px]"
              style={{
                background:
                  preview && !preview.valid ? '#F87171' : activeDrag.segment.color.keyDark,
              }}
            />
            {activeDrag.segment.project.projectName} ·{' '}
            {preview
              ? preview.valid
                ? formatPreviewRange(preview, weekDays)
                : preview.reason
              : `${activeDrag.segment.dates.length} 天`}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DayHeaderCell({ day }: { day: WeekDay }) {
  const date = parseISO(day.workDate)
  const today = isToday(date)
  const dow = date.getDay()
  const weekendWorkday = day.workday && (dow === 0 || dow === 6)

  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-r px-3.5 py-2.5 last:border-r-0',
        !day.workday && 'bg-muted/40 gantt-stripes',
        today && day.workday && 'bg-gantt/5 shadow-[inset_0_2px_0_var(--gantt)]',
      )}
    >
      <span
        className={cn(
          'text-[11.5px] font-semibold text-muted-foreground',
          today && day.workday && 'text-gantt',
          !day.workday && 'text-muted-foreground/60',
        )}
      >
        {format(date, 'EEE', { locale: zhCN })}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-[19px] leading-none font-bold tabular-nums',
            today && day.workday ? 'text-gantt' : !day.workday && 'text-muted-foreground/50',
          )}
        >
          {format(date, 'd')}
        </span>
        {today && day.workday ? (
          <span className="rounded-[5px] bg-gantt/12 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-gantt">
            今天
          </span>
        ) : weekendWorkday ? (
          <span className="rounded-[5px] bg-amber-100 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
            调休
          </span>
        ) : !day.workday ? (
          <span className="rounded-[5px] border bg-background/70 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted-foreground">
            休
          </span>
        ) : null}
      </span>
    </div>
  )
}

function DayColumn({
  day,
  columnIndex,
  editable,
  dragging,
  onAddProject,
}: {
  day: WeekDay
  columnIndex: number
  editable: boolean
  dragging: boolean
  onAddProject: () => void
}) {
  const date = parseISO(day.workDate)
  const today = isToday(date)
  const { setNodeRef } = useDroppable({
    id: `weekly-day-${day.workDate}`,
    disabled: !day.workday,
    data: { type: 'weekly-day', workDate: day.workDate },
  })
  const clickable = day.workday && editable

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!clickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onAddProject()
    }
  }

  return (
    <div
      ref={setNodeRef}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      aria-label={
        clickable ? `在${format(date, 'M月d日EEEE', { locale: zhCN })}添加项目` : undefined
      }
      aria-disabled={!clickable || undefined}
      style={{ gridColumn: columnIndex + 1, gridRow: '1 / -1' }}
      className={cn(
        'group/col relative -my-1.5 border-r border-border/60 last:border-r-0 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-gantt focus-visible:outline-none focus-visible:ring-inset',
        clickable
          ? 'cursor-pointer'
          : !day.workday
            ? 'cursor-not-allowed bg-muted/30 gantt-stripes'
            : 'cursor-default',
        today && day.workday && 'bg-gantt/[0.045]',
        clickable && !dragging && 'hover:bg-gantt/[0.03]',
      )}
      onClick={clickable ? onAddProject : undefined}
      onKeyDown={handleKeyDown}
    >
      {clickable && !dragging ? (
        <span className="pointer-events-none absolute inset-x-1 bottom-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-gantt/0 transition-colors group-hover/col:bg-gantt/8 group-hover/col:text-gantt">
          <Plus className="size-3.5" />
          添加项目
        </span>
      ) : null}
    </div>
  )
}

function AssignmentRibbon({
  segment,
  editable,
  selected,
  onOpen,
  onView,
}: {
  segment: AssignmentSegment
  editable: boolean
  selected: boolean
  onOpen: () => void
  onView: () => void
}) {
  const move = useDraggable({
    id: `weekly-assignment-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-assignment', segment },
    disabled: !editable,
  })
  const resizeStart = useDraggable({
    id: `weekly-resize-start-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-resize', edge: 'start', segment },
    disabled: !editable,
  })
  const resizeEnd = useDraggable({
    id: `weekly-resize-end-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-resize', edge: 'end', segment },
    disabled: !editable,
  })
  const singleDay = segment.dates.length <= 1
  const dragging = move.isDragging || resizeStart.isDragging || resizeEnd.isDragging

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={<div />}
        data-weekly-interactive
        className="group/ribbon relative m-1 min-w-0"
        style={{
          gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
          gridRow: segment.row + 1,
          ...ribbonVars(segment.color),
        }}
      >
        <button
          ref={move.setNodeRef}
          type="button"
          className={cn(
            'relative flex size-full min-w-0 flex-col justify-center gap-px overflow-hidden rounded-[9px] px-3.5 pl-[18px] text-left transition-shadow',
            dragging
              ? 'border-[1.5px] border-dashed border-(--rb-key)/45 bg-(--rb-key)/5 dark:border-(--rb-key-d)/45 dark:bg-(--rb-key-d)/8'
              : 'bg-(--rb-bg) shadow-xs after:absolute after:inset-0 after:bg-(--rb-key) after:opacity-0 after:transition-opacity hover:shadow-sm hover:after:opacity-6 dark:bg-(--rb-bg-d) dark:after:bg-(--rb-key-d)',
            selected &&
              !dragging &&
              'shadow-[0_0_0_1.5px_var(--rb-key),0_8px_18px_-8px_var(--rb-key)] dark:shadow-[0_0_0_1.5px_var(--rb-key-d),0_8px_18px_-8px_var(--rb-key-d)]',
            !editable && 'cursor-pointer',
            'focus-visible:ring-2 focus-visible:ring-(--rb-key) focus-visible:outline-none dark:focus-visible:ring-(--rb-key-d)',
          )}
          aria-label={`${segment.project.projectName}，安排${segment.dates.length}天${editable ? '，拖动可调整日期' : ''}`}
          onClick={onOpen}
          {...move.listeners}
          {...move.attributes}
        >
          {dragging ? null : (
            <>
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-[9px] bg-(--rb-key) dark:bg-(--rb-key-d)" />
              <span className="relative flex min-w-0 items-center gap-1.5">
                {segment.segIndex > 0 ? (
                  <span className="shrink-0 rounded-[5px] bg-(--rb-key)/14 px-1 font-mono text-[9px] text-(--rb-sub) dark:bg-(--rb-key-d)/14 dark:text-(--rb-sub-d)">
                    续
                  </span>
                ) : editable ? (
                  <RibbonGrip />
                ) : null}
                <span className="truncate text-[13px] leading-tight font-bold text-(--rb-name) dark:text-(--rb-name-d)">
                  {segment.project.projectName}
                </span>
              </span>
              {!singleDay && segment.project.planContent ? (
                <span className="relative truncate text-xs leading-tight text-(--rb-sub) dark:text-(--rb-sub-d)">
                  {segment.project.planContent}
                </span>
              ) : null}
            </>
          )}
        </button>

        {editable && !dragging ? (
          <>
            <button
              ref={resizeStart.setNodeRef}
              type="button"
              className="group/handle absolute inset-y-0 left-0 flex w-2.5 cursor-ew-resize items-center justify-start focus-visible:outline-none"
              aria-label={`调整${segment.project.projectName}开始日期`}
              {...resizeStart.listeners}
              {...resizeStart.attributes}
            >
              <span className="ml-1 h-[58%] w-1.5 rounded-[4px] bg-white opacity-0 shadow-sm ring-1 ring-(--rb-key)/40 transition-opacity group-hover/ribbon:opacity-100 group-focus-visible/handle:opacity-100 dark:bg-[#EDEFF3] dark:ring-(--rb-key-d)/50" />
            </button>
            <button
              ref={resizeEnd.setNodeRef}
              type="button"
              className="group/handle absolute inset-y-0 right-0 flex w-2.5 cursor-ew-resize items-center justify-end focus-visible:outline-none"
              aria-label={`调整${segment.project.projectName}结束日期`}
              {...resizeEnd.listeners}
              {...resizeEnd.attributes}
            >
              <span className="mr-1 h-[58%] w-1.5 rounded-[4px] bg-white opacity-0 shadow-sm ring-1 ring-(--rb-key)/40 transition-opacity group-hover/ribbon:opacity-100 group-focus-visible/handle:opacity-100 dark:bg-[#EDEFF3] dark:ring-(--rb-key-d)/50" />
            </button>
          </>
        ) : null}
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={onView}>
            <ChartNoAxesColumnIncreasing />
            查看项目详情
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function RibbonGrip() {
  return (
    <span className="pointer-events-none grid shrink-0 grid-cols-[2px_2px] gap-[2px] opacity-0 transition-opacity group-hover/ribbon:opacity-50">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="size-[2px] rounded-[1px] bg-(--rb-key) dark:bg-(--rb-key-d)" />
      ))}
    </span>
  )
}

function EmptyCanvas({ editable, onAdd }: { editable: boolean; onAdd: () => void }) {
  return (
    <div className="flex min-h-[288px] flex-1 flex-col items-center justify-center gap-3.5 text-center">
      <div className="flex size-[54px] items-center justify-center rounded-2xl border border-gantt/15 bg-gantt/8 text-gantt shadow-[0_4px_12px_-4px_color-mix(in_oklab,var(--gantt)_25%,transparent)]">
        <CalendarPlus className="size-6" />
      </div>
      <span className="text-[15px] font-bold">
        {editable ? '本周还没有安排项目' : '本周没有填写项目'}
      </span>
      {editable ? (
        <Button
          size="sm"
          data-weekly-interactive
          className="bg-gantt text-white hover:bg-gantt/90"
          onClick={onAdd}
        >
          <Plus />
          添加项目
        </Button>
      ) : null}
    </div>
  )
}

function MobileDayList({
  projects,
  weekDays,
  editable,
  onAddProject,
  onOpenProject,
  onViewProject,
}: {
  projects: Array<WeeklyCalendarProject>
  weekDays: Array<WeekDay>
  editable: boolean
  onAddProject: (workDate: string) => void
  onOpenProject: (projectId: number) => void
  onViewProject: (projectId: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-background p-3 shadow-xs sm:hidden">
      {weekDays.map(day => {
        const date = parseISO(day.workDate)
        const today = isToday(date)
        const dow = date.getDay()
        const weekendWorkday = day.workday && (dow === 0 || dow === 6)
        const dayProjects = projects
          .map((project, index) => ({ project, color: ribbonColor(index) }))
          .filter(({ project }) =>
            project.days.some(item => item.workDate === day.workDate && item.assigned),
          )

        return (
          <div
            key={day.workDate}
            className={cn('relative flex gap-3', !day.workday && 'opacity-60')}
          >
            {today ? (
              <span className="absolute top-0.5 bottom-0.5 -left-3 w-[3px] rounded-full bg-gantt" />
            ) : null}
            <div className="w-10 shrink-0 pt-1.5 text-center">
              <div
                className={cn(
                  'text-[11px] font-bold',
                  today ? 'text-gantt' : 'text-muted-foreground',
                )}
              >
                {format(date, 'EEEEE', { locale: zhCN })}
              </div>
              <div className={cn('text-[17px] font-extrabold tabular-nums', today && 'text-gantt')}>
                {format(date, 'd')}
              </div>
              {today ? (
                <div className="mt-0.5 rounded bg-gantt/12 py-px font-mono text-[8px] font-semibold text-gantt">
                  今天
                </div>
              ) : weekendWorkday ? (
                <div className="mt-0.5 rounded bg-amber-100 py-px font-mono text-[8px] font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-400">
                  调休
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {!day.workday ? (
                <div className="rounded-[11px] border gantt-stripes p-2.5 text-xs text-muted-foreground">
                  休息日 · 不可安排
                </div>
              ) : dayProjects.length === 0 ? (
                editable ? (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-dashed p-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-gantt/50 hover:text-gantt"
                    onClick={() => onAddProject(day.workDate)}
                  >
                    <Plus className="size-3.5" />
                    添加项目
                  </button>
                ) : (
                  <div className="rounded-[11px] border border-dashed p-2.5 text-xs text-muted-foreground/60">
                    无安排
                  </div>
                )
              ) : (
                dayProjects.map(({ project, color }) => (
                  <button
                    key={project.projectId}
                    type="button"
                    style={ribbonVars(color)}
                    className="relative overflow-hidden rounded-[11px] bg-(--rb-bg) px-3 py-2 pl-3.5 text-left dark:bg-(--rb-bg-d)"
                    onClick={() =>
                      editable ? onOpenProject(project.projectId) : onViewProject(project.projectId)
                    }
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-(--rb-key) dark:bg-(--rb-key-d)" />
                    <div className="truncate text-[13px] font-bold text-(--rb-name) dark:text-(--rb-name-d)">
                      {project.projectName}
                    </div>
                    {project.planContent ? (
                      <div className="truncate text-[11.5px] text-(--rb-sub) dark:text-(--rb-sub-d)">
                        {project.planContent}
                      </div>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function defaultAddDate(weekDays: Array<WeekDay>) {
  const today = weekDays.find(day => day.workday && isToday(parseISO(day.workDate)))
  return (today ?? weekDays.find(day => day.workday) ?? weekDays[0]).workDate
}

/**
 * 计算拖动落点预览：与 weekly-editor 中 moveSegment/resizeSegment 的落点规则保持一致，
 * 松手前把「将覆盖的日期范围 + 是否合法」实时反馈到列高亮与跟随浮层。
 */
function buildDragPreview(
  drag: ActiveDrag,
  overDate: string,
  weekDays: Array<WeekDay>,
): DragPreview | null {
  const overIndex = weekDays.findIndex(day => day.workDate === overDate)
  if (overIndex < 0) return null
  const segment = drag.segment
  let start: number
  let end: number
  if (drag.kind === 'move') {
    start = overIndex
    end = overIndex + (segment.endIndex - segment.startIndex)
  } else if (drag.edge === 'start') {
    start = overIndex
    end = segment.endIndex
  } else {
    start = segment.startIndex
    end = overIndex
  }
  if (start > end) {
    return {
      start: end,
      end: start,
      valid: false,
      reason: '开始日期不能晚于结束日期',
    }
  }
  if (end > weekDays.length - 1) {
    return { start, end: weekDays.length - 1, valid: false, reason: '不能拖出当前周' }
  }
  if (weekDays.slice(start, end + 1).some(day => !day.workday)) {
    return { start, end, valid: false, reason: '休息日不能安排项目' }
  }
  return { start, end, valid: true }
}

function formatPreviewRange(preview: DragPreview, weekDays: Array<WeekDay>): string {
  const startDate = parseISO(weekDays[preview.start].workDate)
  const days = preview.end - preview.start + 1
  if (days === 1) return `${format(startDate, 'M月d日')} · 1 天`
  const endDate = parseISO(weekDays[preview.end].workDate)
  return `${format(startDate, 'M月d日')} – ${format(endDate, 'M月d日')} · ${days} 天`
}

function buildSegments(
  projects: Array<WeeklyCalendarProject>,
  weekDays: Array<WeekDay>,
): Array<AssignmentSegment> {
  const dateIndex = new Map(weekDays.map((day, index) => [day.workDate, index]))
  const segments: Array<AssignmentSegment> = []

  projects.forEach((project, row) => {
    const color = ribbonColor(row)
    const assignedIndexes = project.days
      .filter(day => day.assigned)
      .map(day => dateIndex.get(day.workDate))
      .filter((index): index is number => index !== undefined)
      .sort((a, b) => a - b)

    let start = 0
    let segIndex = 0
    while (start < assignedIndexes.length) {
      let end = start
      while (
        end + 1 < assignedIndexes.length &&
        assignedIndexes[end + 1] === assignedIndexes[end] + 1
      ) {
        end++
      }
      const indexes = assignedIndexes.slice(start, end + 1)
      segments.push({
        project,
        color,
        dates: indexes.map(index => weekDays[index].workDate),
        startIndex: indexes[0],
        endIndex: indexes[indexes.length - 1],
        row,
        segIndex,
      })
      segIndex++
      start = end + 1
    }
  })

  return segments
}
