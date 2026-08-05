import { createFileRoute } from '@tanstack/react-router'
import { addDays, addWeeks, format, getISOWeek, parseISO, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { startTransition, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { WeeklyUserOption } from '@/api/weekly-report'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WeeklyEditor } from '@/components/weekly-report/weekly-editor'
import { WeeklySharingControl } from '@/components/weekly-report/weekly-sharing-control'
import { useWeeklyPlan } from '@/hooks/use-weekly-report'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/_app/weekly-report')({
  component: WeeklyReportPage,
})

function WeeklyReportPage() {
  const currentUser = useAuthStore(state => state.user)!
  const [previewUser, setPreviewUser] = useState<WeeklyUserOption | null>(null)
  const [weekStart, setWeekStart] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  )
  const ownerUserId = previewUser?.id ?? currentUser.id
  const start = parseISO(weekStart)
  const planQuery = useWeeklyPlan(ownerUserId, weekStart)

  useEffect(() => {
    if (!previewUser || !planQuery.isError) return
    toast.error(`已无法查看${previewUser.nickName}的周报`)
    setPreviewUser(null)
  }, [planQuery.isError, previewUser])

  function navigateWeek(delta: number) {
    startTransition(() => {
      setWeekStart(format(addWeeks(start, delta), 'yyyy-MM-dd'))
    })
  }

  function goToCurrentWeek() {
    startTransition(() => {
      setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
    })
  }

  const plan = planQuery.data
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
      <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 md:h-full md:min-h-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">
              {previewUser ? `${previewUser.nickName}的周报` : '周报'}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              安排本周每天投入的项目，周会时可共享查看。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <div className="flex h-9 items-center overflow-hidden rounded-[10px] border bg-background shadow-xs">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-[34px] rounded-none"
                aria-label="上一周"
                onClick={() => navigateWeek(-1)}
              >
                <ChevronLeft />
              </Button>
              <button
                type="button"
                className="flex h-full min-w-[240px] items-center justify-center border-x px-3 text-[13px] font-semibold hover:bg-muted/50"
                onClick={goToCurrentWeek}
              >
                {format(start, 'M月d日')} – {format(addDays(start, 6), 'M月d日')}
                <span className="ml-1 font-normal text-muted-foreground">
                  （第 {getISOWeek(start)} 周）
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-[34px] rounded-none"
                aria-label="下一周"
                onClick={() => navigateWeek(1)}
              >
                <ChevronRight />
              </Button>
            </div>
            <WeeklySharingControl previewUser={previewUser} onPreviewUser={setPreviewUser} />
          </div>
        </div>

        {planQuery.isPending ? (
          <WeeklyReportSkeleton />
        ) : planQuery.isError || !plan ? (
          <div className="rounded-xl border py-20 text-center">
            <p className="text-sm text-muted-foreground">周报加载失败，请稍后重试。</p>
            <Button variant="outline" className="mt-3" onClick={() => planQuery.refetch()}>
              重新加载
            </Button>
          </div>
        ) : (
          <WeeklyEditor
            plan={plan}
            onNavigateWeek={navigateWeek}
            onExitPreview={previewUser ? () => setPreviewUser(null) : undefined}
          />
        )}
      </div>
    </main>
  )
}

function WeeklyReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
