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
  Lock,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { leadingPunctuationInset } from '@/lib/optical-align'
import { cn } from '@/lib/utils'

import type { BoardProject, CellKind, DayQuota } from './weekly-board'

interface WeekDay {
  workDate: string
  workday: boolean
}

/**
 * 颜色只表达一件事：这一格处在什么状态。
 * 三个实际状态的底色与 UT 日历页一致（见 `@/lib/ut-utils` 的 getStatusColorClass），
 * 计划态用品牌色淡底。项目身份只靠名称，不再给每个项目分配颜色——
 * 一屏十几条不同颜色的色带会把「黄=待审批、绿=已通过」这个真正要读的信号淹掉。
 */
const CELL_STYLES: Record<CellKind, { surface: string; label: string; sub: string }> = {
  plan: {
    // 深浅要和 yellow-100 / green-100 那一档相当，太淡色带边界会糊在白底上
    surface: 'bg-gantt/14 dark:bg-gantt/22',
    label: 'text-gantt',
    sub: 'text-muted-foreground',
  },
  check: {
    surface: 'bg-yellow-100 dark:bg-yellow-900/50',
    label: 'text-yellow-800 dark:text-yellow-200',
    sub: 'text-yellow-700/75 dark:text-yellow-200/70',
  },
  confirmed: {
    surface: 'bg-green-100 dark:bg-green-900/50',
    label: 'text-green-800 dark:text-green-200',
    sub: 'text-green-700/75 dark:text-green-200/70',
  },
  rejected: {
    surface: 'bg-red-100 dark:bg-red-900/50',
    label: 'text-red-800 dark:text-red-200',
    sub: 'text-red-700/75 dark:text-red-200/70',
  },
}

const KIND_LABEL: Record<CellKind, string> = {
  plan: '计划',
  check: '待审批',
  confirmed: '已通过',
  rejected: '已驳回',
}

interface AssignmentSegment {
  project: BoardProject
  dates: Array<string>
  startIndex: number
  endIndex: number
  row: number
  kind: CellKind
  /** 已提交（待审批 / 已通过）：只读，不能拖动也不能取消 */
  locked: boolean
  /** 属于周报草稿，可拖拽调整日期 */
  assigned: boolean
  /** 段内实际 UT 合计 */
  actualUt: number
  /** 段内预估 UT 合计 */
  plannedUt: number
  /** 当天额度已被实际 UT 占满，这段计划无法兑现 */
  unfulfilled: boolean
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
  projects: Array<BoardProject>
  weekDays: Array<WeekDay>
  quotaByDate: Map<string, DayQuota>
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
  quotaByDate,
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

  const segments = useMemo(() => buildSegments(projects), [projects])
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

  // 拖动中的落点预览：松手后段将覆盖的日期范围与合法性
  const preview = useMemo(
    () =>
      activeDrag && overDate ? buildDragPreview(activeDrag, overDate, weekDays, quotaByDate) : null,
    [activeDrag, overDate, weekDays, quotaByDate],
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
              <DayHeaderCell key={day.workDate} day={day} quota={quotaByDate.get(day.workDate)} />
            ))}
          </div>

          {isEmpty ? (
            <EmptyCanvas
              editable={editable}
              onAdd={() => addProject(defaultAddDate(weekDays, quotaByDate))}
            />
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
                  quota={quotaByDate.get(day.workDate)}
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
                      ? 'border-gantt/55 bg-gantt/10'
                      : 'border-destructive/50 bg-destructive/10 dark:bg-destructive/15',
                  )}
                  style={{
                    gridColumn: `${preview.start + 1} / ${preview.end + 2}`,
                    gridRow: activeDrag.segment.row + 1,
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
            onClick={() => addProject(defaultAddDate(weekDays, quotaByDate))}
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
        quotaByDate={quotaByDate}
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
                background: preview && !preview.valid ? '#F87171' : '#818CF8',
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

/**
 * 容量条：一天固定 1.0 UT，实心段为已提交（绿=已通过、黄=待审批），
 * 浅色段为计划占用，留白表示这天完全没安排。
 */
function DayCapacityBar({ quota }: { quota: DayQuota }) {
  const parts = [
    quota.confirmedUt > 0 ? `已通过 ${quota.confirmedUt.toFixed(1)}` : null,
    quota.checkUt > 0 ? `待审批 ${quota.checkUt.toFixed(1)}` : null,
    quota.plannedUt > 0 ? `计划 ${quota.plannedUt.toFixed(1)}` : null,
  ].filter(Boolean)

  return (
    <span
      className="mt-0.5 flex h-1 w-full overflow-hidden rounded-full bg-border/60"
      title={parts.length > 0 ? `${parts.join(' · ')} UT` : '未安排'}
      aria-label={parts.length > 0 ? `${parts.join('，')} UT` : '未安排'}
    >
      {quota.confirmedUt > 0 ? (
        <span
          className="h-full bg-green-500 dark:bg-green-400"
          style={{ width: `${quota.confirmedUt * 100}%` }}
        />
      ) : null}
      {quota.checkUt > 0 ? (
        <span
          className="h-full bg-yellow-500 dark:bg-yellow-400"
          style={{ width: `${quota.checkUt * 100}%` }}
        />
      ) : null}
      {quota.plannedUt > 0 ? (
        <span className="h-full bg-gantt/35" style={{ width: `${quota.plannedUt * 100}%` }} />
      ) : null}
    </span>
  )
}

function DayHeaderCell({ day, quota }: { day: WeekDay; quota?: DayQuota }) {
  const date = parseISO(day.workDate)
  const today = isToday(date)
  const dow = date.getDay()
  const weekendWorkday = day.workday && (dow === 0 || dow === 6)

  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-r border-border/60 px-3.5 py-2.5 last:border-r-0',
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
        {format(date, 'EEEEE', { locale: zhCN })}
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
      {day.workday && quota ? <DayCapacityBar quota={quota} /> : null}
    </div>
  )
}

function DayColumn({
  day,
  columnIndex,
  quota,
  editable,
  dragging,
  onAddProject,
}: {
  day: WeekDay
  columnIndex: number
  quota?: DayQuota
  editable: boolean
  dragging: boolean
  onAddProject: () => void
}) {
  const date = parseISO(day.workDate)
  const { setNodeRef } = useDroppable({
    id: `weekly-day-${day.workDate}`,
    disabled: !day.workday,
    data: { type: 'weekly-day', workDate: day.workDate },
  })
  // 额度用完的那天不能再加项目：一天最多排的项目数 = 剩余额度 ÷ 0.1
  const full = (quota?.addableCount ?? 1) <= 0
  const clickable = day.workday && editable && !full

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
        'group/col relative -my-1.5 border-r border-border/40 last:border-r-0 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-gantt focus-visible:outline-none focus-visible:ring-inset',
        clickable
          ? 'cursor-pointer'
          : !day.workday
            ? 'cursor-not-allowed bg-muted/30 gantt-stripes'
            : 'cursor-default',
        // 今天只在表头标记（底色 + 顶部实线），画布区不再整列铺底色：
        // 那条竖着的浅色带会和项目色带抢注意力，且容易被误读成「这一列被选中了」
        clickable && !dragging && 'hover:bg-gantt/[0.03]',
      )}
      onClick={clickable ? onAddProject : undefined}
      onKeyDown={handleKeyDown}
    >
      {clickable && !dragging ? (
        <span className="pointer-events-none absolute inset-x-1 bottom-2 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-gantt/0 transition-colors group-hover/col:text-gantt">
          <Plus className="size-3.5" />
          添加项目
        </span>
      ) : full && day.workday && editable && !dragging ? (
        <span className="pointer-events-none absolute inset-x-1 bottom-2 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-muted-foreground/0 transition-colors group-hover/col:text-muted-foreground">
          <Lock className="size-3" />
          UT 已满
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
  // 已提交的格子是实际 UT 的投影，不属于草稿，不能拖动也不能取消
  const draggable = editable && !segment.locked && segment.assigned
  const move = useDraggable({
    id: `weekly-assignment-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-assignment', segment },
    disabled: !draggable,
  })
  const resizeStart = useDraggable({
    id: `weekly-resize-start-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-resize', edge: 'start', segment },
    disabled: !draggable,
  })
  const resizeEnd = useDraggable({
    id: `weekly-resize-end-${segment.project.projectId}-${segment.dates[0]}`,
    data: { type: 'weekly-resize', edge: 'end', segment },
    disabled: !draggable,
  })
  const singleDay = segment.dates.length <= 1
  const dragging = move.isDragging || resizeStart.isDragging || resizeEnd.isDragging
  const style = CELL_STYLES[segment.kind]
  const isPlan = segment.kind === 'plan'
  // 自动均分出来的预估 UT 不印在色带上——它会随当天增删项目跳动，看着像数据在乱变；
  // 手填的本周 UT 是用户自己定的量，稳定，才值得占这个位置。
  const utText = isPlan
    ? segment.project.weekPlannedUt > 0 && segment.plannedUt > 0
      ? `${segment.plannedUt.toFixed(1)} UT`
      : null
    : `${segment.actualUt.toFixed(1)} UT`
  const hint = segment.unfulfilled
    ? // 额度可能是被已提交的实际 UT 吃掉的，也可能是被同一天填了本周 UT 的项目占走的
      '当天额度已被占满，这段计划没兑现'
    : segment.kind === 'rejected'
      ? '这笔 UT 已被驳回，去 UT 日历重新提交'
      : segment.locked
        ? `已提交 ${segment.actualUt.toFixed(1)} UT，要改请去 UT 日历`
        : null
  // 状态提示优先于计划内容；单日色带太窄放不下第二行，改由 title 兜底
  const summary = hint ?? (singleDay ? null : segment.project.planContent)
  // 首字是全角开括号时把它悬挂出去，让项目名和下方计划内容视觉左对齐
  const nameInset = leadingPunctuationInset(segment.project.projectName, {
    fontSize: 13,
    fontWeight: 700,
  })

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={<div />}
        data-weekly-interactive
        className="group/ribbon relative m-1 min-w-0"
        style={{
          gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
          gridRow: segment.row + 1,
        }}
      >
        {/* 色带上项目名和计划内容都会被截断，hover 展开完整文本；用组件而非原生 title，
            原生 tooltip 延迟长、不能换行，长段计划内容读不了 */}
        <Tooltip>
          <TooltipTrigger
            delay={320}
            render={
              <button
                ref={move.setNodeRef}
                type="button"
                className={cn(
                  'relative flex size-full min-w-0 flex-col justify-center gap-px overflow-hidden rounded-[9px] px-3.5 text-left transition-shadow',
                  dragging
                    ? 'border-[1.5px] border-dashed border-gantt/45 bg-gantt/5'
                    : cn(
                        style.surface,
                        'shadow-xs after:absolute after:inset-0 after:bg-foreground after:opacity-0 after:transition-opacity hover:shadow-sm hover:after:opacity-4',
                      ),
                  segment.unfulfilled && !dragging && 'opacity-55 saturate-50',
                  selected &&
                    !dragging &&
                    'shadow-[0_0_0_1.5px_var(--gantt),0_8px_18px_-8px_var(--gantt)]',
                  !draggable && 'cursor-pointer',
                  'focus-visible:ring-2 focus-visible:ring-gantt focus-visible:outline-none',
                )}
                aria-label={`${segment.project.projectName}，${KIND_LABEL[segment.kind]}，${segment.dates.length}天${
                  utText ? `，${isPlan ? '计划' : '实际'} ${utText}` : ''
                }${segment.locked ? '，已提交不可修改' : draggable ? '，拖动可调整日期' : ''}`}
                onClick={onOpen}
                {...move.listeners}
                {...move.attributes}
              >
                {dragging ? null : (
                  <>
                    <span className="relative flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          'truncate text-[13px] leading-tight font-bold',
                          style.label,
                          segment.unfulfilled && 'line-through',
                        )}
                        style={nameInset ? { marginInlineStart: `-${nameInset}px` } : undefined}
                      >
                        {segment.project.projectName}
                      </span>
                      {utText ? (
                        <span
                          className={cn(
                            'ml-auto flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums',
                            style.sub,
                          )}
                        >
                          {segment.locked ? <Lock className="size-2.5" /> : null}
                          {utText}
                        </span>
                      ) : null}
                    </span>
                    {summary ? (
                      <span className={cn('relative truncate text-xs leading-tight', style.sub)}>
                        {summary}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            }
          />
          {dragging ? null : (
            <TooltipContent
              side="top"
              sideOffset={6}
              className="max-w-[22rem] flex-col items-start gap-1.5 py-2 text-left"
            >
              <span className="text-[12.5px] leading-snug font-semibold">
                {segment.project.projectName}
              </span>
              <span className="text-[11px] text-background/65 tabular-nums">
                {dateRangeText(segment)}
                {utText ? ` · ${isPlan ? '计划' : '实际'} ${utText}` : ''}
              </span>
              {segment.project.planContent ? (
                <span className="text-[11.5px] leading-relaxed whitespace-pre-wrap text-background/85">
                  {segment.project.planContent}
                </span>
              ) : (
                <span className="text-[11.5px] text-background/55">未填写本周工作内容</span>
              )}
              {hint ? <span className="text-[11px] text-background/65">{hint}</span> : null}
            </TooltipContent>
          )}
        </Tooltip>

        {draggable && !dragging ? (
          <>
            <button
              ref={resizeStart.setNodeRef}
              type="button"
              className="group/handle absolute inset-y-0 left-0 flex w-2.5 cursor-ew-resize items-center justify-start focus-visible:outline-none"
              aria-label={`调整${segment.project.projectName}开始日期`}
              {...resizeStart.listeners}
              {...resizeStart.attributes}
            >
              <span className="ml-1 h-[58%] w-1.5 rounded-[4px] bg-white opacity-0 shadow-sm ring-1 ring-gantt/40 transition-opacity group-hover/ribbon:opacity-100 group-focus-visible/handle:opacity-100 dark:bg-[#EDEFF3]" />
            </button>
            <button
              ref={resizeEnd.setNodeRef}
              type="button"
              className="group/handle absolute inset-y-0 right-0 flex w-2.5 cursor-ew-resize items-center justify-end focus-visible:outline-none"
              aria-label={`调整${segment.project.projectName}结束日期`}
              {...resizeEnd.listeners}
              {...resizeEnd.attributes}
            >
              <span className="mr-1 h-[58%] w-1.5 rounded-[4px] bg-white opacity-0 shadow-sm ring-1 ring-gantt/40 transition-opacity group-hover/ribbon:opacity-100 group-focus-visible/handle:opacity-100 dark:bg-[#EDEFF3]" />
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
  quotaByDate,
  editable,
  onAddProject,
  onOpenProject,
  onViewProject,
}: {
  projects: Array<BoardProject>
  weekDays: Array<WeekDay>
  quotaByDate: Map<string, DayQuota>
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
        const quota = quotaByDate.get(day.workDate)
        const dayProjects = projects
          .map(project => ({
            project,
            cell: project.days.find(item => item.workDate === day.workDate),
          }))
          .filter(
            (item): item is { project: BoardProject; cell: BoardProject['days'][number] } =>
              item.cell?.kind != null,
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
                    disabled={(quota?.addableCount ?? 1) <= 0}
                    className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] border-dashed p-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-gantt/50 hover:text-gantt disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
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
                dayProjects.map(({ project, cell }) => {
                  const kind = cell.kind as CellKind
                  const style = CELL_STYLES[kind]
                  return (
                    <button
                      key={project.projectId}
                      type="button"
                      className={cn(
                        'relative overflow-hidden rounded-[11px] px-3 py-2 text-left',
                        style.surface,
                      )}
                      onClick={() =>
                        editable
                          ? onOpenProject(project.projectId)
                          : onViewProject(project.projectId)
                      }
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={cn('truncate text-[13px] font-bold', style.label)}>
                          {project.projectName}
                        </span>
                        {kind !== 'plan' ? (
                          <span
                            className={cn(
                              'ml-auto flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums',
                              style.sub,
                            )}
                          >
                            {cell.locked ? <Lock className="size-2.5" /> : null}
                            {cell.actualUt.toFixed(1)} UT
                          </span>
                        ) : null}
                      </div>
                      {project.planContent ? (
                        <div className={cn('truncate text-[11.5px]', style.sub)}>
                          {project.planContent}
                        </div>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 默认落点优先今天，其次第一个还有 UT 额度的工作日 */
function defaultAddDate(weekDays: Array<WeekDay>, quotaByDate: Map<string, DayQuota>) {
  const hasQuota = (day: WeekDay) => (quotaByDate.get(day.workDate)?.addableCount ?? 1) > 0
  const today = weekDays.find(
    day => day.workday && hasQuota(day) && isToday(parseISO(day.workDate)),
  )
  const firstOpen = weekDays.find(day => day.workday && hasQuota(day))
  return (today ?? firstOpen ?? weekDays.find(day => day.workday) ?? weekDays[0]).workDate
}

/**
 * 计算拖动落点预览：与 weekly-editor 中 moveSegment/resizeSegment 的落点规则保持一致，
 * 松手前把「将覆盖的日期范围 + 是否合法」实时反馈到列高亮与跟随浮层。
 */
function buildDragPreview(
  drag: ActiveDrag,
  overDate: string,
  weekDays: Array<WeekDay>,
  quotaByDate: Map<string, DayQuota>,
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
  const targets = segment.project.days.slice(start, end + 1)
  if (targets.some(cell => cell.locked)) {
    return { start, end, valid: false, reason: '该日已提交 UT，不能改计划' }
  }
  // 落到新格子才需要占额度；落回自己原本占的格子不额外消耗
  const overflow = targets.some(
    cell => !cell.assigned && (quotaByDate.get(cell.workDate)?.addableCount ?? 0) <= 0,
  )
  if (overflow) {
    return { start, end, valid: false, reason: '当天 UT 已满' }
  }
  return { start, end, valid: true }
}

/** 色带 tooltip 里的日期范围：单日给到星期几，跨天给起止和天数 */
function dateRangeText(segment: AssignmentSegment): string {
  const start = parseISO(segment.dates[0])
  if (segment.dates.length === 1) return format(start, 'M月d日 EEEE', { locale: zhCN })
  const end = parseISO(segment.dates[segment.dates.length - 1])
  return `${format(start, 'M月d日')} – ${format(end, 'M月d日')} · ${segment.dates.length} 天`
}

function formatPreviewRange(preview: DragPreview, weekDays: Array<WeekDay>): string {
  const startDate = parseISO(weekDays[preview.start].workDate)
  const days = preview.end - preview.start + 1
  if (days === 1) return `${format(startDate, 'M月d日')} · 1 天`
  const endDate = parseISO(weekDays[preview.end].workDate)
  return `${format(startDate, 'M月d日')} – ${format(endDate, 'M月d日')} · ${days} 天`
}

/**
 * 把每行的格子切成连续同状态的色带。
 * 状态变化处必须断开——周三填了 UT 不能把周四周五的计划也一起锁死。
 */
function buildSegments(projects: Array<BoardProject>): Array<AssignmentSegment> {
  const segments: Array<AssignmentSegment> = []

  projects.forEach((project, row) => {
    let index = 0
    while (index < project.days.length) {
      const head = project.days[index]
      if (head.kind === null) {
        index++
        continue
      }
      let end = index
      while (
        end + 1 < project.days.length &&
        project.days[end + 1].kind === head.kind &&
        project.days[end + 1].assigned === head.assigned &&
        // 未兑现的那几天要单独成段，否则跨天色带里只有部分天没额度时看不出来
        project.days[end + 1].unfulfilled === head.unfulfilled
      ) {
        end++
      }
      const cells = project.days.slice(index, end + 1)
      segments.push({
        project,
        dates: cells.map(cell => cell.workDate),
        startIndex: index,
        endIndex: end,
        row,
        kind: head.kind,
        locked: head.locked,
        assigned: head.assigned,
        actualUt: cells.reduce((sum, cell) => sum + cell.actualUt, 0),
        plannedUt: cells.reduce((sum, cell) => sum + cell.plannedUt, 0),
        unfulfilled: head.unfulfilled,
      })
      index = end + 1
    }
  })

  return segments
}
