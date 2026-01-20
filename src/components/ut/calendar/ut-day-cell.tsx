import { UtStatusDot } from '../status/ut-status-badge'
import type { DailyUtSummary } from '@/types/ut'
import { UtStatus } from '@/types/ut'
import { cn } from '@/lib/utils'

interface UtDayCellProps {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  summary?: DailyUtSummary
}

export function UtDayCell({ date, isCurrentMonth, isToday, summary }: UtDayCellProps) {
  const day = new Date(date).getDate()
  const hasData = summary && summary.allocations.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Date number */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full text-sm',
            !isCurrentMonth && 'text-muted-foreground',
            isToday && 'bg-primary text-primary-foreground',
          )}
        >
          {day}
        </span>
        {hasData && <UtStatusDot status={summary.status} />}
      </div>

      {/* Allocations preview */}
      {hasData && (
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {summary.allocations.slice(0, 2).map((allocation, i) => (
            <div
              key={i}
              className={cn(
                'truncate rounded px-1 py-0.5 text-xs',
                allocation.status === UtStatus.Confirmed &&
                  'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                allocation.status === UtStatus.Check &&
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
                allocation.status === UtStatus.Rejected &&
                  'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
                allocation.status === UtStatus.None && 'bg-muted text-muted-foreground',
              )}
            >
              {allocation.projectName} ({allocation.value})
            </div>
          ))}
          {summary.allocations.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{summary.allocations.length - 2} 更多
            </div>
          )}
        </div>
      )}

      {/* UT total indicator */}
      {hasData && (
        <div className="mt-auto pt-1">
          <div
            className={cn(
              'text-right text-xs font-medium',
              summary.totalUt === 1 ? 'text-green-600' : 'text-orange-600',
            )}
          >
            {summary.totalUt} UT
          </div>
        </div>
      )}
    </div>
  )
}
