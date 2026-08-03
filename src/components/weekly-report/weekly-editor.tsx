import { useDebounce } from 'ahooks'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Eye, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type {
  WeeklyPlan,
  WeeklyPlanProject,
  WeeklyPlanSaveRequest,
  WeeklyProjectOption,
} from '@/api/weekly-report'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useIsDesktop } from '@/hooks/use-mobile'
import { useSaveWeeklyPlan, useWeeklyProjectOptions } from '@/hooks/use-weekly-report'
import { cn } from '@/lib/utils'

import { buildLockedCells, buildWeeklyBoard, cellKey } from './weekly-board'
import type { BoardCell } from './weekly-board'
import { WeeklyCalendarGrid } from './weekly-calendar-grid'
import { WeeklyProjectPanel } from './weekly-project-sheet'

interface DraftProject extends Omit<WeeklyPlanProject, 'days'> {
  days: Array<{ workDate: string; assigned: boolean; dayNote: string; workday: boolean }>
}

function createDraftProjects(plan: WeeklyPlan): Array<DraftProject> {
  // 已提交 UT 的格子由实际数据接管：不进草稿，也就不会被保存接口回写
  const locked = buildLockedCells(plan.actuals ?? [])
  return plan.projects.map(project => {
    const existingDays = new Map(project.days.map(day => [day.workDate, day]))
    return {
      ...project,
      planContent: project.planContent ?? '',
      resultContent: project.resultContent ?? '',
      days: plan.weekDays.map(day => {
        const existing = existingDays.get(day.workDate)
        const assigned = existing?.assigned ?? (existing?.plannedUt ?? 0) > 0
        return {
          ...day,
          assigned: assigned && !locked.has(cellKey(project.projectId, day.workDate)),
          dayNote: existing?.dayNote ?? '',
        }
      }),
    }
  })
}

function hasAssignments(project: DraftProject) {
  return project.days.some(day => day.assigned)
}

function formatDay(workDate: string) {
  return format(parseISO(workDate), 'M月d日')
}

function createSaveRequest(projects: Array<DraftProject>, version: number): WeeklyPlanSaveRequest {
  return {
    version,
    projects: projects.filter(hasAssignments).map((project, index) => ({
      projectId: project.projectId,
      planContent: project.planContent ?? '',
      resultContent: project.resultContent ?? '',
      sortOrder: index,
      days: project.days
        .filter(day => day.assigned)
        .map(day => ({
          workDate: day.workDate,
          assigned: true,
          dayNote: day.dayNote,
        })),
    })),
  }
}

export function WeeklyEditor({
  plan,
  onNavigateWeek,
  onExitPreview,
}: {
  plan: WeeklyPlan
  onNavigateWeek: (delta: number) => void
  onExitPreview?: () => void
}) {
  const [projects, setProjects] = useState(() => createDraftProjects(plan))
  const [initialFingerprint, setInitialFingerprint] = useState(() =>
    JSON.stringify(createSaveRequest(createDraftProjects(plan), plan.version).projects),
  )
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [analyticsProjectId, setAnalyticsProjectId] = useState<number | null>(null)
  const isDesktop = useIsDesktop()
  const { mutate: runSave, isPending: isSaving } = useSaveWeeklyPlan(
    plan.userId,
    plan.weekStartDate,
  )

  // 切周/切人时在渲染期重置草稿与浮层状态。
  // 用派生状态代替外层 key，避免整个编辑器卸载重建导致的闪烁。
  const planKey = `${plan.userId}-${plan.weekStartDate}-${plan.editable}`
  const [syncedKey, setSyncedKey] = useState(planKey)
  if (syncedKey !== planKey) {
    setSyncedKey(planKey)
    const fresh = createDraftProjects(plan)
    setProjects(fresh)
    setInitialFingerprint(JSON.stringify(createSaveRequest(fresh, plan.version).projects))
    setPickerDate(null)
    setEditingProjectId(null)
    setAnalyticsProjectId(null)
  }

  // 计划草稿与实际 UT 合流后的甘特图数据；实际 UT 是只读投影，不参与保存
  const board = useMemo(
    () =>
      buildWeeklyBoard({
        draft: projects,
        actuals: plan.actuals ?? [],
        weekDays: plan.weekDays,
      }),
    [projects, plan.actuals, plan.weekDays],
  )
  const editingProject = projects.find(project => project.projectId === editingProjectId)
  const editingCells = board.projects.find(project => project.projectId === editingProjectId)?.days

  function cellOf(projectId: number, workDate: string): BoardCell | undefined {
    return board.projects
      .find(project => project.projectId === projectId)
      ?.days.find(day => day.workDate === workDate)
  }

  /** 计划不能覆盖已提交的 UT，也不能超出当天剩余额度 */
  function canPlanOn(projectId: number, workDate: string): boolean {
    const cell = cellOf(projectId, workDate)
    if (cell?.locked) {
      toast.error(`${formatDay(workDate)}该项目已提交 UT，不能再排计划`)
      return false
    }
    if (!cell?.assigned && (board.quotaByDate.get(workDate)?.addableCount ?? 1) <= 0) {
      toast.error(`${formatDay(workDate)}的 UT 已满，无法再安排项目`)
      return false
    }
    return true
  }

  function openProjectPicker(workDate: string) {
    if ((board.quotaByDate.get(workDate)?.addableCount ?? 1) <= 0) {
      toast.error(`${formatDay(workDate)}的 UT 已满，无法再安排项目`)
      return
    }
    setPickerDate(workDate)
  }

  const plannedProjectIds = useMemo(
    () => new Set(board.projects.map(project => project.projectId)),
    [board.projects],
  )

  function openProject(projectId: number) {
    // 只在 UT 日历里出现过的项目不在草稿里，没有可编辑的计划，直接看项目分析
    if (projects.some(project => project.projectId === projectId)) setEditingProjectId(projectId)
    else setAnalyticsProjectId(projectId)
  }

  // 改动即自动保存（防抖）：不再区分草稿/发布，保存后共享成员实时可见
  const debouncedProjects = useDebounce(projects, { wait: 800 })
  const failedFingerprintRef = useRef<string | null>(null)
  useEffect(() => {
    // debouncedProjects !== projects：防抖尚未结算或刚切周，跳过以免把旧内容写到新目标
    if (!plan.editable || isSaving || debouncedProjects !== projects) return
    const body = createSaveRequest(projects, plan.version)
    const fingerprint = JSON.stringify(body.projects)
    if (fingerprint === initialFingerprint || fingerprint === failedFingerprintRef.current) return
    runSave(body, {
      onSuccess: () => {
        setInitialFingerprint(fingerprint)
        failedFingerprintRef.current = null
      },
      onError: () => {
        failedFingerprintRef.current = fingerprint
        toast.error('自动保存失败，请稍后重试')
      },
    })
  }, [
    debouncedProjects,
    projects,
    initialFingerprint,
    isSaving,
    plan.editable,
    plan.version,
    runSave,
  ])

  function updateProject(projectId: number, update: (project: DraftProject) => DraftProject) {
    setProjects(current =>
      current.map(project => (project.projectId === projectId ? update(project) : project)),
    )
  }

  function addProject(option: WeeklyProjectOption, workDate: string) {
    if (!canPlanOn(option.id, workDate)) return
    setProjects(current => {
      const existing = current.find(project => project.projectId === option.id)
      if (existing) {
        return current.map(project =>
          project.projectId === option.id
            ? {
                ...project,
                days: project.days.map(day =>
                  day.workDate === workDate ? { ...day, assigned: true } : day,
                ),
              }
            : project,
        )
      }
      return [
        ...current,
        {
          id: undefined,
          projectId: option.id,
          projectName: option.projectName,
          projectCode: option.projectCode,
          planContent: '',
          resultContent: '',
          sortOrder: current.length,
          assignedDays: 1,
          totalPlannedUt: 0,
          metrics: {
            projectTotalUt: option.projectTotalUt,
            projectConfirmedUt: option.projectConfirmedUt,
            projectPendingUt: 0,
            myAllocatedUt: option.myAllocatedUt,
            myConfirmedUt: option.myConfirmedUt,
            myPendingUt: 0,
            myRemainingUt: Math.max(0, option.myAllocatedUt - option.myConfirmedUt),
            myWeekActualUt: 0,
            myWeekPendingUt: 0,
          },
          days: plan.weekDays.map(day => ({
            ...day,
            assigned: day.workDate === workDate,
            dayNote: '',
          })),
        },
      ]
    })
    setPickerDate(null)
    setEditingProjectId(option.id)
  }

  function toggleProjectDay(projectId: number, workDate: string) {
    const cell = cellOf(projectId, workDate)
    // 取消已排的日期不占额度，只有新增才需要校验
    if (!cell?.assigned && !canPlanOn(projectId, workDate)) return
    updateProject(projectId, project => ({
      ...project,
      days: project.days.map(day =>
        day.workDate === workDate && day.workday ? { ...day, assigned: !day.assigned } : day,
      ),
    }))
  }

  function moveSegment(projectId: number, dates: Array<string>, targetDate: string) {
    if (!plan.editable) return
    const firstDate = dates[0]
    const delta = differenceInCalendarDays(parseISO(targetDate), parseISO(firstDate))
    if (delta === 0) return

    const shiftedDates = dates.map(date => format(addDays(parseISO(date), delta), 'yyyy-MM-dd'))
    const weekDayMap = new Map(plan.weekDays.map(day => [day.workDate, day.workday]))
    if (shiftedDates.some(date => !weekDayMap.has(date))) {
      toast.error('项目不能拖出当前周')
      return
    }
    if (shiftedDates.some(date => !weekDayMap.get(date))) {
      toast.error('休息日不能安排项目')
      return
    }
    if (!shiftedDates.every(date => canPlanOn(projectId, date))) return

    const sourceSet = new Set(dates)
    const targetSet = new Set(shiftedDates)
    updateProject(projectId, project => ({
      ...project,
      days: project.days.map(day => ({
        ...day,
        assigned: targetSet.has(day.workDate) || (day.assigned && !sourceSet.has(day.workDate)),
      })),
    }))
  }

  function resizeSegment(
    projectId: number,
    dates: Array<string>,
    targetDate: string,
    edge: 'start' | 'end',
  ) {
    if (!plan.editable) return
    const dayIndex = new Map(plan.weekDays.map((day, index) => [day.workDate, index]))
    const startIndex = dayIndex.get(dates[0])
    const endIndex = dayIndex.get(dates[dates.length - 1])
    const targetIndex = dayIndex.get(targetDate)
    if (startIndex === undefined || endIndex === undefined || targetIndex === undefined) return
    if (
      (edge === 'start' && targetIndex > endIndex) ||
      (edge === 'end' && targetIndex < startIndex)
    ) {
      toast.error('开始日期不能晚于结束日期')
      return
    }

    const nextStart = edge === 'start' ? targetIndex : startIndex
    const nextEnd = edge === 'end' ? targetIndex : endIndex
    const range = plan.weekDays.slice(nextStart, nextEnd + 1)
    if (range.some(day => !day.workday)) {
      toast.error('休息日不能安排项目')
      return
    }
    if (!range.every(day => canPlanOn(projectId, day.workDate))) return

    const sourceSet = new Set(dates)
    const targetSet = new Set(range.map(day => day.workDate))
    updateProject(projectId, project => ({
      ...project,
      days: project.days.map(day => ({
        ...day,
        assigned: targetSet.has(day.workDate) || (day.assigned && !sourceSet.has(day.workDate)),
      })),
    }))
  }

  function closeProjectDetails() {
    setEditingProjectId(null)
    setProjects(current => current.filter(hasAssignments))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!plan.editable ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200/70 bg-linear-to-r from-blue-50/90 to-blue-50/50 px-4 py-2.5 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-500/5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-blue-500 text-xs font-bold text-white">
                {plan.userNickName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-bold">{plan.userNickName}的周报</span>
            <span className="flex h-6 items-center gap-1.5 rounded-[7px] bg-blue-100 px-2.5 text-xs font-bold text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
              <Eye className="size-3.5" />
              共享只读
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-blue-900/60 md:inline dark:text-blue-200/60">
              点击色带查看项目分析
            </span>
            {onExitPreview ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-blue-200 bg-white/70 text-blue-700 hover:bg-white hover:text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                onClick={onExitPreview}
              >
                <X className="size-3.5" />
                退出预览
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:min-h-0 sm:flex-1 sm:flex-row sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-xs">
        <WeeklyCalendarGrid
          projects={board.projects}
          weekDays={plan.weekDays}
          quotaByDate={board.quotaByDate}
          editable={plan.editable}
          selectedProjectId={editingProjectId}
          onAddProject={openProjectPicker}
          onOpenProject={openProject}
          onViewProject={setAnalyticsProjectId}
          onMoveSegment={moveSegment}
          onResizeSegment={resizeSegment}
          onNavigateWeek={onNavigateWeek}
        />

        <WeeklyProjectPanel
          open={analyticsProjectId !== null}
          projectId={analyticsProjectId}
          isMobile={!isDesktop}
          onClose={() => setAnalyticsProjectId(null)}
        />
      </div>

      {plan.editable && pickerDate ? (
        <ProjectPickerDialog
          workDate={pickerDate}
          plannedProjectIds={plannedProjectIds}
          open
          onOpenChange={open => !open && setPickerDate(null)}
          onSelect={option => addProject(option, pickerDate)}
        />
      ) : null}

      {plan.editable && editingProject ? (
        <ProjectDetailsDialog
          project={editingProject}
          cells={editingCells}
          open
          onOpenChange={open => !open && closeProjectDetails()}
          onContentChange={value =>
            updateProject(editingProject.projectId, project => ({
              ...project,
              planContent: value,
            }))
          }
          onToggleDay={date => toggleProjectDay(editingProject.projectId, date)}
          onRemove={() => {
            setProjects(current =>
              current.filter(project => project.projectId !== editingProject.projectId),
            )
            setEditingProjectId(null)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * 项目额度进度条：已确认 UT 占项目总 UT 的比例。
 * 快用完时转琥珀、用尽转红——「剩 0.0」的项目一眼可辨，比只看数字快。
 */
function ProjectQuotaBar({ total, confirmed }: { total: number; confirmed: number }) {
  const ratio = total > 0 ? Math.min(1, confirmed / total) : 0
  const remaining = Math.max(0, total - confirmed)
  const tone =
    total > 0 && remaining <= 0
      ? 'bg-red-500 dark:bg-red-400'
      : total > 0 && remaining / total <= 0.1
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-gantt/55'

  return (
    <span className="mt-1 flex h-[3px] w-full overflow-hidden rounded-full bg-border/70">
      <span className={cn('h-full rounded-full', tone)} style={{ width: `${ratio * 100}%` }} />
    </span>
  )
}

function ProjectPickerDialog({
  workDate,
  plannedProjectIds,
  open,
  onOpenChange,
  onSelect,
}: {
  workDate: string
  /** 本周甘特图里已有的项目，用于打「已排」标 */
  plannedProjectIds: Set<number>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (option: WeeklyProjectOption) => void
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, { wait: 250 })
  const { data = [], isPending } = useWeeklyProjectOptions(debouncedSearch)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            添加到 {format(parseISO(workDate), 'M月d日 EEEE', { locale: zhCN })}
          </DialogTitle>
          <DialogDescription>从 PMS 项目库中选择，项目名称不能自行创建。</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-9"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="搜索项目名称…"
          />
        </div>
        <div className="max-h-[26rem] space-y-1.5 overflow-y-auto">
          {isPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">正在加载项目…</p>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">没有找到匹配项目</p>
          ) : (
            data.map(option => {
              const remaining = Math.max(0, option.projectTotalUt - option.projectConfirmedUt)
              return (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-[9px] px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  onClick={() => onSelect(option)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 self-center">
                    <span className="min-w-0 truncate text-[13.5px] font-semibold">
                      {option.projectName}
                    </span>
                    {plannedProjectIds.has(option.id) ? (
                      <span className="shrink-0 rounded-[5px] bg-gantt/10 px-1.5 py-px text-[10px] font-semibold text-gantt">
                        已排
                      </span>
                    ) : null}
                  </span>
                  <span className="w-[104px] shrink-0">
                    <span className="block text-right text-[11px] text-muted-foreground tabular-nums">
                      总 {option.projectTotalUt.toFixed(1)} / 剩 {remaining.toFixed(1)}
                    </span>
                    <ProjectQuotaBar
                      total={option.projectTotalUt}
                      confirmed={option.projectConfirmedUt}
                    />
                  </span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProjectDetailsDialog({
  project,
  cells,
  open,
  onOpenChange,
  onContentChange,
  onToggleDay,
  onRemove,
}: {
  project: DraftProject
  cells?: Array<BoardCell>
  open: boolean
  onOpenChange: (open: boolean) => void
  onContentChange: (value: string) => void
  onToggleDay: (workDate: string) => void
  onRemove: () => void
}) {
  const cellByDate = new Map((cells ?? []).map(cell => [cell.workDate, cell]))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="truncate">{project.projectName}</span>
          </DialogTitle>
        </DialogHeader>

        <div>
          <div className="mb-2 text-[12.5px] font-bold text-muted-foreground">安排到本周</div>
          <div className="grid grid-cols-7 gap-2">
            {project.days.map(day => {
              const date = parseISO(day.workDate)
              const cell = cellByDate.get(day.workDate)
              // 已提交 UT 的那天由日历页说了算，这里只展示状态、不给改
              const locked = cell?.locked === true
              return day.workday ? (
                <button
                  key={day.workDate}
                  type="button"
                  aria-pressed={day.assigned}
                  disabled={locked}
                  title={
                    locked ? `已提交 ${cell?.actualUt.toFixed(1)} UT，去 UT 日历修改` : undefined
                  }
                  className={cn(
                    'flex h-[46px] flex-col items-center justify-center gap-px rounded-[10px] border text-[13px] font-bold transition-colors',
                    locked
                      ? cn(
                          'cursor-not-allowed border-transparent',
                          cell?.kind === 'check'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                        )
                      : day.assigned
                        ? 'border-transparent bg-gantt text-white shadow-sm'
                        : 'bg-background text-muted-foreground hover:border-gantt/45 hover:bg-gantt/5',
                  )}
                  onClick={() => onToggleDay(day.workDate)}
                >
                  <span>{format(date, 'EEEEE', { locale: zhCN })}</span>
                  <span
                    className={cn(
                      'text-[9.5px] font-medium tabular-nums',
                      locked
                        ? 'opacity-85'
                        : day.assigned
                          ? 'opacity-85'
                          : 'text-muted-foreground/70',
                    )}
                  >
                    {locked ? `${cell?.actualUt.toFixed(1)}` : format(date, 'd')}
                  </span>
                </button>
              ) : (
                <div
                  key={day.workDate}
                  className="flex h-[46px] cursor-not-allowed flex-col items-center justify-center gap-px rounded-[10px] border border-dashed gantt-stripes text-[13px] font-bold text-muted-foreground/50"
                >
                  <span>{format(date, 'EEEEE', { locale: zhCN })}</span>
                  <span className="text-[8px]">休</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[12.5px] font-bold text-muted-foreground">
            本周工作内容
          </label>
          <Textarea
            value={project.planContent ?? ''}
            onChange={event => onContentChange(event.target.value)}
            placeholder="写清本周目标、交付物或需要协同的事项…"
            rows={5}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            工作内容按项目只写一次；日历中的连续日期会自动合并成一条项目安排。
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 /> 移除项目
          </Button>
          <Button
            className="bg-gantt text-white hover:bg-gantt/90"
            onClick={() => onOpenChange(false)}
          >
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
