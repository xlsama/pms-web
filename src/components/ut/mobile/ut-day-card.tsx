import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Card, CardContent } from '@/components/ui/card'
import { getAdjustmentType } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
import type { DailyData } from '@/types/ut'

import { UtStatusBadge } from '../status/ut-status-badge'

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

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isToday && 'ring-2 ring-primary',
        isWeekend && 'bg-muted/30',
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-semibold', isToday && 'text-primary')}>
                {format(dateObj, 'd日')}
              </span>
              <span className="text-sm text-muted-foreground">
                {format(dateObj, 'EEEE', { locale: zhCN })}
              </span>
              {adjustment && (
                <span
                  className={cn(
                    'flex size-3.5 items-center justify-center rounded-full text-[8px] leading-none font-medium text-white',
                    adjustment === 'work' ? 'bg-red-400' : 'bg-green-400',
                  )}
                >
                  {adjustment === 'work' ? '班' : '休'}
                </span>
              )}
            </div>

            {hasData ? (
              <div className="mt-2 space-y-1">
                {dailyData.records.map((record, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{record.projectName}</span>
                    <span className="font-medium">{record.value} UT</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {isWeekend ? '休息日' : '点击填写'}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {hasData && <UtStatusBadge status={dailyData.records[0].status} />}
            {hasData && (
              <span
                className={cn(
                  'text-sm font-medium',
                  dailyData.totalUt === 1 ? 'text-green-600' : 'text-orange-600',
                )}
              >
                {dailyData.totalUt} / 1
              </span>
            )}
            {!hasData && !isWeekend && (
              <span className="text-xs text-muted-foreground">未填写</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
