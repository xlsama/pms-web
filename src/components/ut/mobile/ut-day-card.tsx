import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdjustmentType, getDateLabel } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import type { DailyData } from '@/types/ut'

interface UtDayCardProps {
  date: string
  isToday: boolean
  isWeekend: boolean
  dailyData?: DailyData
  onClick: () => void
}

export function UtDayCard({ date, isToday, isWeekend, dailyData, onClick }: UtDayCardProps) {
  const dateObj = new Date(date)
  const hasData = dailyData && dailyData.records.length > 0
  const adjustment = getAdjustmentType(date)
  const { text: lunarText, isFestival } = getDateLabel(date)

  return (
    <Card
      className={cn(
        'gap-2 py-3 transition-all',
        adjustment === 'rest'
          ? 'cursor-not-allowed bg-muted/50 dark:bg-muted'
          : 'cursor-pointer hover:border-primary/50',
        isToday && 'ring-2 ring-primary',
      )}
      onClick={adjustment === 'rest' ? undefined : onClick}
    >
      <CardHeader className="px-3">
        <CardTitle className="flex items-center gap-2">
          <div className="relative">
            <span className={cn('text-lg', isToday && 'text-primary')}>
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
          <span className={cn('text-xs', isFestival ? 'text-primary' : 'text-muted-foreground')}>
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

      <CardContent className="px-3">
        {hasData ? (
          <div className="space-y-1">
            {dailyData.records.map((record, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{record.projectName}</span>
                <span className="shrink-0 font-medium">{record.value} UT</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{isWeekend ? '休息日' : '点击填写'}</p>
        )}
      </CardContent>
    </Card>
  )
}
