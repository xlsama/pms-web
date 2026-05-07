import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import type { UtRange, YearlyTopProject, YearlyUtData } from '@/hooks/use-yearly-ut'
import { cn } from '@/lib/utils'

interface UtYearlyChartProps {
  data: YearlyUtData
}

const TOTAL_UT_LABEL: Record<UtRange, string> = {
  year: '今年总 UT',
  month: '本月总 UT',
  all: '累计总 UT',
}

const EMPTY_RANGE_LABEL: Record<UtRange, string> = {
  year: '今年',
  month: '本月',
  all: '入职以来',
}

export function UtYearlyChart({ data }: UtYearlyChartProps) {
  const { range, bucketRows, projects, stats, isPending, isError } = data

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    for (const p of projects) {
      config[p.key] = { label: p.name, color: p.color }
    }
    return config
  }, [projects])

  const stackOrder = useMemo(() => [...projects].reverse(), [projects])

  const visibleData = useMemo(() => {
    if (bucketRows.length === 0) return bucketRows
    const lastIdx = bucketRows.length - 1
    return bucketRows.filter(
      (row, idx) => idx === lastIdx || projects.some(p => (row[p.key] as number) > 0),
    )
  }, [bucketRows, projects])

  if (isPending) return <ChartSkeleton />

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载失败，请稍后重试
      </div>
    )
  }

  if (stats.totalUt === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>{EMPTY_RANGE_LABEL[range]}暂无已确认的工时</span>
        <span className="text-xs">填写并提交后会在这里看到趋势</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label={TOTAL_UT_LABEL[range]} value={formatUt(stats.totalUt)} />
        <StatCard label="参与项目" value={`${stats.projectCount} 个`} />
        <StatCard
          label="主力项目"
          value={stats.topProject?.name ?? '-'}
          hint={stats.topProject ? `${formatUt(stats.topProject.totalUt)} UT` : undefined}
          truncate
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {stats.top3.length > 0 && <Top3Row top3={stats.top3} />}

      <ChartContainer config={chartConfig} className="aspect-auto h-[480px] w-full">
        <BarChart data={visibleData} margin={{ left: 4, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucketLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={visibleData.length > 12 ? 'preserveStartEnd' : 0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={v => String(Math.round(v as number))}
          />
          <ChartTooltip
            content={
              <SortedTooltipContent
                formatter={(value, _name, item) => {
                  const key = String(item?.dataKey ?? '')
                  const label = chartConfig[key]?.label ?? key
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatUt(value as number)}
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          {stackOrder.map((p, idx) => {
            const isBottom = idx === 0
            const isTop = idx === stackOrder.length - 1
            const radius: [number, number, number, number] =
              isBottom && isTop
                ? [4, 4, 4, 4]
                : isTop
                  ? [4, 4, 0, 0]
                  : isBottom
                    ? [0, 0, 4, 4]
                    : [0, 0, 0, 0]
            return (
              <Bar
                key={p.key}
                dataKey={p.key}
                stackId="ut"
                fill={p.color}
                radius={radius}
                isAnimationActive={idx === 0}
              />
            )
          })}
          <ChartLegend
            content={
              <ChartLegendContent className="!grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-3 sm:gap-y-2 sm:px-12 [&>div]:min-w-0 [&>div]:items-start [&>div:nth-child(3n)]:sm:justify-self-end [&>div:nth-child(3n+2)]:sm:justify-self-center [&>div>div:first-child]:mt-1" />
            }
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  truncate,
  className,
}: {
  label: string
  value: string
  hint?: string
  truncate?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-lg border bg-card px-3 py-2.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn('text-base font-semibold tabular-nums', truncate && 'truncate')}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>}
    </div>
  )
}

function Top3Row({ top3 }: { top3: Array<YearlyTopProject> }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {top3.map((p, idx) => (
        <div
          key={p.name}
          className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
        >
          <span className="shrink-0 text-sm" aria-hidden>
            {medals[idx]}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm" title={p.name}>
            {p.name}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {formatUt(p.totalUt)} · {p.percent}%
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="col-span-2 h-16 rounded-lg sm:col-span-1" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-md" />
        ))}
      </div>
      <Skeleton className="aspect-[16/9] w-full rounded-lg" />
    </div>
  )
}

function formatUt(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

type TooltipContentProps = React.ComponentProps<typeof ChartTooltipContent>

function SortedTooltipContent({ payload, ...rest }: TooltipContentProps) {
  const sorted = payload
    ? [...payload].sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
    : payload
  return <ChartTooltipContent {...rest} payload={sorted} indicator="dot" />
}
