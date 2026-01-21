import type { DailyUtSummary } from '@/types/ut'
import { UtStatus } from '@/types/ut'
import { cn } from '@/lib/utils'

// 农历假数据（后续可替换为 chinese-days 库）
const LUNAR_DAYS = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
]

function getLunarDay(date: string): string {
  // 假数据：使用日期的天数来模拟农历
  const d = new Date(date).getDate()
  return LUNAR_DAYS[(d - 1) % 30]
}

interface UtDayCellProps {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  summary?: DailyUtSummary
}

export function UtDayCell({ date, isCurrentMonth, isToday, summary }: UtDayCellProps) {
  const day = new Date(date).getDate()
  const hasData = summary && summary.allocations.length > 0
  const lunarDay = getLunarDay(date)

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
        <span className={cn('text-xs text-muted-foreground', !isCurrentMonth && 'opacity-50')}>
          {lunarDay}
        </span>
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
