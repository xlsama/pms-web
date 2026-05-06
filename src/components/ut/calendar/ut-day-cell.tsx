import { getAdjustmentType, getDateLabel, getStatusColorClass } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import type { DailyData } from '@/types/ut'

interface UtDayCellProps {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  dailyData?: DailyData
}

export function UtDayCell({ date, isCurrentMonth, isToday, dailyData }: UtDayCellProps) {
  const day = new Date(date).getDate()
  const hasData = dailyData && dailyData.records.length > 0
  const { text: lunarText, isFestival } = getDateLabel(date)
  const adjustment = getAdjustmentType(date)

  return (
    <div className="flex h-full flex-col">
      {/* Date number */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-sm',
              !isCurrentMonth && 'text-muted-foreground',
              isToday && 'bg-primary font-semibold text-primary-foreground',
            )}
          >
            {day}
          </span>
          {adjustment && (
            <span
              className={cn(
                'absolute -top-px -right-3.5 flex size-3.5 items-center justify-center rounded-full text-[8px] leading-none font-semibold text-white',
                adjustment === 'work' ? 'bg-red-400' : 'bg-green-400',
              )}
            >
              {adjustment === 'work' ? '班' : '休'}
            </span>
          )}
        </div>
        <span
          className={cn(
            'text-[10px]',
            isFestival ? 'font-medium text-red-500' : 'text-muted-foreground',
            !isCurrentMonth && 'opacity-50',
          )}
        >
          {lunarText}
        </span>
      </div>

      {/* Records preview */}
      {hasData && (
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dailyData.records.slice(0, 2).map((record, i) => (
            <div
              key={i}
              className={cn(
                'truncate rounded px-1 py-0.5 text-xs',
                getStatusColorClass(record.status),
              )}
            >
              {record.projectName} ({record.value})
            </div>
          ))}
          {dailyData.records.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{dailyData.records.length - 2} 更多
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
              dailyData.totalUt === 1 ? 'text-green-600' : 'text-orange-600',
            )}
          >
            {dailyData.totalUt} UT
          </div>
        </div>
      )}
    </div>
  )
}
