import { format, parseISO, startOfWeek, subWeeks } from 'date-fns'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useWeeklyProjectAnalytics } from '@/hooks/use-weekly-report'
import { cn } from '@/lib/utils'

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
  onClose,
}: {
  open: boolean
  projectId: number | null
  isMobile: boolean
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
              <ProjectAnalytics projectId={projectId} />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function ProjectAnalytics({ projectId }: { projectId: number | null }) {
  const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
  const from = format(subWeeks(currentWeek, 11), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')
  const { data, isPending, isError } = useWeeklyProjectAnalytics(projectId, from, to)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b p-4 pr-12">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-medium text-foreground">
            {data?.project.projectName ?? '项目详情'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {data?.project.projectCode ?? '查看项目 UT 消耗与最近 12 周参与趋势'}
          </p>
        </div>
        <Badge variant="outline">近 12 周</Badge>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {isPending ? (
          <>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </>
        ) : isError || !data ? (
          <div className="rounded-xl border border-dashed py-24 text-center text-sm text-muted-foreground">
            暂时无法加载该项目，或你没有查看权限。
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>UT 概览</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <SummaryMetric label="项目总 UT" value={data.project.projectTotalUt} />
                  <SummaryMetric label="已确认 UT" value={data.project.projectConfirmedUt} />
                  <SummaryMetric
                    label="项目剩余 UT"
                    value={Math.max(
                      0,
                      data.project.projectTotalUt - data.project.projectConfirmedUt,
                    )}
                  />
                </div>
                <Progress
                  value={
                    data.project.projectTotalUt > 0
                      ? Math.min(
                          100,
                          (data.project.projectConfirmedUt / data.project.projectTotalUt) * 100,
                        )
                      : 0
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>计划与实际趋势</CardTitle>
                <p className="text-xs text-muted-foreground">
                  柱形为已发布周报中的参与天数，折线为审批确认后的正式 UT；草稿不计入统计。
                </p>
              </CardHeader>
              <CardContent>
                {data.trend.length === 0 ? (
                  <div className="py-20 text-center text-sm text-muted-foreground">
                    暂无趋势数据
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      initialDimension={{ width: 560, height: 288 }}
                    >
                      <ComposedChart data={data.trend} margin={{ left: 0, right: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="weekStartDate"
                          tickFormatter={value => format(parseISO(value as string), 'M/d')}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                        />
                        <YAxis
                          yAxisId="days"
                          domain={[0, 7]}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          width={28}
                        />
                        <YAxis
                          yAxisId="ut"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          width={34}
                        />
                        <Tooltip
                          labelFormatter={value =>
                            `${format(parseISO(value as string), 'M月d日')}当周`
                          }
                          formatter={(value, name) =>
                            name === 'plannedDays'
                              ? [`${Number(value)} 天`, '计划参与']
                              : [`${Number(value).toFixed(1)} UT`, '已确认实际']
                          }
                        />
                        <Bar
                          yAxisId="days"
                          dataKey="plannedDays"
                          fill="var(--chart-1)"
                          fillOpacity={0.72}
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          yAxisId="ut"
                          type="monotone"
                          dataKey="confirmedUt"
                          stroke="var(--chart-2)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{data.canViewMembers ? '成员投入' : '我的投入'}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">暂无投入数据</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {data.members.map(member => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <Avatar className="size-7 shrink-0">
                          {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
                          <AvatarFallback className="text-xs">
                            {member.nickName.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {member.nickName}
                        </span>
                        <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                          参与 {member.plannedDays} 天 · 确认 {member.confirmedUt} UT
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {value.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">UT</span>
      </div>
    </div>
  )
}
