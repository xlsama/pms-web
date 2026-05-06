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
import type { YearlyTopProject, YearlyUtData } from '@/hooks/use-yearly-ut'
import { cn } from '@/lib/utils'

interface UtYearlyChartProps {
  data: YearlyUtData
}

export function UtYearlyChart({ data }: UtYearlyChartProps) {
  const { year, monthlyData, projects, stats, isPending, isError } = data

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    for (const p of projects) {
      config[p.key] = { label: p.name, color: p.color }
    }
    return config
  }, [projects])

  const stackOrder = useMemo(() => [...projects].reverse(), [projects])

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
        <span>{year} 年暂无已确认的工时</span>
        <span className="text-xs">填写并提交后会在这里看到趋势</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="今年总 UT" value={formatUt(stats.totalUt)} />
        <StatCard label="参与项目" value={`${stats.projectCount} 个`} />
        <StatCard label="最忙月份" value={stats.busiestMonth} />
        <StatCard
          label="主力项目"
          value={stats.topProject?.name ?? '-'}
          hint={stats.topProject ? `${formatUt(stats.topProject.totalUt)} UT` : undefined}
          truncate
        />
      </div>

      {stats.top3.length > 0 && <Top3Row top3={stats.top3} />}

      <ChartContainer config={chartConfig} className="aspect-auto h-[480px] w-full">
        <BarChart data={monthlyData} margin={{ left: 4, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={v => String(Math.round(v as number))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
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
            content={<ChartLegendContent className="flex-wrap [&>div]:whitespace-nowrap" />}
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
}: {
  label: string
  value: string
  hint?: string
  truncate?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2.5">
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
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
