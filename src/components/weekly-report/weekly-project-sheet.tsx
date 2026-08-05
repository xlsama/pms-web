import { format, startOfWeek, subWeeks } from 'date-fns'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'

import type { WeeklyProjectAnalytics, WeeklyProjectOption } from '@/api/weekly-report'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useWeeklyProjectAnalytics } from '@/hooks/use-weekly-report'
import { cn } from '@/lib/utils'

import { WeeklyAvatar } from './weekly-avatar'

/** 桌面并排时面板展开后的宽度（px），内层固定该宽度，仅外层容器补间宽度避免图表反复重排。 */
const PANEL_WIDTH = 440

/**
 * 项目详情面板：常驻在日历容器内的右侧栏，不是覆盖全屏的浮层。
 * - 桌面（sm+）：与日历左右并排、无遮罩，可继续点击其他项目切换内容，仅点关闭按钮收起。
 * - 移动端：右侧覆盖抽屉，带遮罩，点遮罩或 Esc 关闭。
 */
export function WeeklyProjectPanel({
  open,
  projectId,
  isMobile,
  owner,
  onClose,
}: {
  open: boolean
  projectId: number | null
  isMobile: boolean
  /** 预览他人周报时传入，统计按该所有者的口径出；看自己的周报时不传 */
  owner?: { userId: number; weekStartDate: string; nickName: string }
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // 移动端为覆盖式抽屉，打开时锁定背景滚动
    const previousOverflow = isMobile ? document.body.style.overflow : ''
    if (isMobile) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (isMobile) document.body.style.overflow = previousOverflow
    }
  }, [open, isMobile, onClose])

  return (
    <>
      <AnimatePresence>
        {open && isMobile ? (
          <motion.div
            key="weekly-panel-backdrop"
            aria-hidden
            className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.aside
            key="weekly-panel"
            className={cn(
              isMobile
                ? 'fixed inset-y-0 right-0 z-50 w-full max-w-md'
                : 'relative z-10 min-h-0 shrink-0 self-stretch overflow-hidden',
            )}
            {...(isMobile
              ? {
                  initial: { x: '100%' },
                  animate: { x: 0 },
                  exit: { x: '100%' },
                  transition: { type: 'spring', stiffness: 420, damping: 42 },
                }
              : {
                  initial: { width: 0, opacity: 0 },
                  animate: { width: PANEL_WIDTH, opacity: 1 },
                  exit: { width: 0, opacity: 0 },
                  transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
                })}
          >
            <div
              className={cn(
                'relative flex h-full flex-col overflow-y-auto bg-background',
                isMobile ? 'w-full border-l shadow-xl' : 'w-[440px] border-l',
              )}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 z-10"
                onClick={onClose}
                aria-label="关闭"
              >
                <X />
              </Button>
              <ProjectAnalytics projectId={projectId} owner={owner} />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function ProjectAnalytics({
  projectId,
  owner,
}: {
  projectId: number | null
  owner?: { userId: number; weekStartDate: string; nickName: string }
}) {
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
  const from = format(subWeeks(currentWeek, 11), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')
  const { data, isPending, isError } = useWeeklyProjectAnalytics(
    projectId,
    from,
    to,
    owner && { userId: owner.userId, weekStartDate: owner.weekStartDate },
  )

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2 p-4 pr-12">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-medium text-foreground">
            {data?.project.projectName ?? '项目详情'}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {isPending ? (
          <>
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </>
        ) : isError || !data ? (
          <div className="rounded-xl border border-dashed py-24 text-center text-sm text-muted-foreground">
            暂时无法加载该项目，或你没有查看权限。
          </div>
        ) : (
          <>
            <UtOverview project={data.project} plannedUt={data.projectPlannedUt ?? 0} />
            <MemberContribution
              members={data.members}
              canViewMembers={data.canViewMembers}
              ownerName={owner?.nickName}
            />
          </>
        )}
      </div>
    </>
  )
}

/** UT 概览：项目总量 / 已确认 / 剩余 / 周报计划（都是项目全员、全周期累计口径）。 */
function UtOverview({ project, plannedUt }: { project: WeeklyProjectOption; plannedUt: number }) {
  const remaining = Math.max(0, project.projectTotalUt - project.projectConfirmedUt)
  const projectPct =
    project.projectTotalUt > 0
      ? Math.min(100, (project.projectConfirmedUt / project.projectTotalUt) * 100)
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">UT 概览</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* 面板只有 440px 宽，四个指标排成一行会挤成两行文字，故 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric label="项目总 UT" value={project.projectTotalUt} />
          <SummaryMetric label="已确认 UT" value={project.projectConfirmedUt} />
          <SummaryMetric label="项目剩余 UT" value={remaining} />
          <SummaryMetric label="总计划 UT" value={plannedUt} hint="全员在周报里排的计划 UT 合计" />
        </div>
        <Progress value={projectPct} />
      </CardContent>
    </Card>
  )
}

/** 成员投入榜：横条宽度为该成员近 12 周确认 UT（或参与天数）占比，替代纯文字列表。 */
function MemberContribution({
  members,
  canViewMembers,
  ownerName,
}: {
  members: WeeklyProjectAnalytics['members']
  canViewMembers: boolean
  /** 预览他人周报时的所有者昵称：非全员视角下列出的是 TA 的投入，标题不能再写「我的」 */
  ownerName?: string
}) {
  const totalUt = members.reduce((sum, member) => sum + member.confirmedUt, 0)
  const totalDays = members.reduce((sum, member) => sum + member.plannedDays, 0)
  // 有确认 UT 时按 UT 占比；否则退化为按参与天数占比，避免全成 0 宽
  const basis = totalUt > 0 ? 'ut' : totalDays > 0 ? 'days' : 'none'
  // 单成员时占比恒为 100%、铺满整行没有意义，仅多成员时才画占比条
  const showBar = members.length > 1 && basis !== 'none'
  // 消耗 UT 多的排在前面（后端已按此排序，前端再显式兜底一次，不依赖返回顺序）
  const ranked = [...members].sort((a, b) => b.confirmedUt - a.confirmedUt)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {canViewMembers ? '成员投入' : ownerName ? `${ownerName}的投入` : '我的投入'}
        </CardTitle>
        {canViewMembers && members.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            横条为近 12 周{basis === 'days' ? '参与天数' : '确认 UT'}占比。
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无投入数据</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {ranked.map(member => {
              const pct =
                basis === 'ut'
                  ? member.confirmedUt / totalUt
                  : basis === 'days'
                    ? member.plannedDays / totalDays
                    : 0
              return (
                <div
                  key={member.userId}
                  className="relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2"
                >
                  {showBar ? (
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-gantt/10"
                      style={{ width: `${Math.max(pct * 100, 0)}%` }}
                    />
                  ) : null}
                  <WeeklyAvatar
                    name={member.nickName}
                    seed={member.userId}
                    src={member.avatar}
                    className="relative"
                  />
                  <span className="relative min-w-0 flex-1 truncate text-sm font-medium">
                    {member.nickName}
                  </span>
                  <span className="relative shrink-0 text-xs text-muted-foreground tabular-nums">
                    {member.confirmedUt.toFixed(1)} UT
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryMetric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3" title={hint}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {value.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">UT</span>
      </div>
    </div>
  )
}
