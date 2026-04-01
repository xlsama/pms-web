import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdjustmentType, getDateLabel, isFutureDate } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import type { DailyData } from '@/types/ut'

interface UtDayCardProps {
  date: string
  isToday: boolean
  isUnfilled?: boolean
  dailyData?: DailyData
  onClick: () => void
}

export function UtDayCard({ date, isToday, isUnfilled, dailyData, onClick }: UtDayCardProps) {
  const dateObj = new Date(date)
  const hasData = dailyData && dailyData.records.length > 0
  const adjustment = getAdjustmentType(date)
  const isDisabled = adjustment === 'rest' || isFutureDate(date)
  const { text: lunarText, isFestival } = getDateLabel(date)

  return (
    <Card
      className={cn(
        'min-h-[85px] gap-2 border-border/50 py-3 shadow-none transition-all dark:border-border/30',
        isDisabled
          ? 'cursor-not-allowed bg-muted/50 dark:bg-muted'
          : 'cursor-pointer hover:border-primary/30',
        isToday && 'ring-1 ring-primary/40 dark:ring-primary/30',
        isUnfilled && !isDisabled && 'bg-orange-50/60 dark:bg-orange-500/10',
      )}
      onClick={isDisabled ? undefined : onClick}
    >
      <CardHeader className="px-3">
        <CardTitle className="flex items-center gap-2">
          <div className="relative">
            <span className={cn('text-lg whitespace-nowrap', isToday && 'text-primary')}>
              {format(dateObj, 'd日')}
            </span>
            {adjustment && (
              <span
                className={cn(
                  'absolute -top-1.75 -right-3 flex size-3.5 items-center justify-center rounded-full text-[8px] leading-none font-medium text-white',
                  adjustment === 'work' ? 'bg-red-400' : 'bg-green-400',
                )}
              >
                {adjustment === 'work' ? '班' : '休'}
              </span>
            )}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              isFestival ? 'text-red-500' : 'text-muted-foreground',
            )}
          >
            {format(dateObj, 'EE', { locale: zhCN })} · {lunarText}
          </span>
        </CardTitle>
        {hasData && (
          <CardAction>
            <span
              className={cn(
                'text-sm font-medium',
                dailyData.totalUt === 1 ? 'text-green-600' : 'text-orange-600',
              )}
            >
              {dailyData.totalUt} / 1
            </span>
          </CardAction>
        )}
      </CardHeader>

      {hasData && (
        <CardContent className="px-3">
          <div className="space-y-1">
            {dailyData.records.map((record, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{record.projectName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{record.value} UT</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
