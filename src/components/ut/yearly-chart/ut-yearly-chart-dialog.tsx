import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { type UtRange, useYearlyUtData, type YearlyUtData } from '@/hooks/use-yearly-ut'
import { parseEntryDate } from '@/lib/ut-utils'
import { useAuthStore } from '@/stores/auth'

import { RangeSwitcher } from './range-switcher'
import { UtYearlyChart } from './ut-yearly-chart'

interface UtYearlyChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UtYearlyChartDialog({ open, onOpenChange }: UtYearlyChartDialogProps) {
  const isMobile = useIsMobile()
  const [range, setRange] = useState<UtRange>('year')
  const data = useYearlyUtData(open, range)

  const user = useAuthStore(state => state.user)
  const entryDate = useMemo(() => parseEntryDate(user?.entryTime), [user?.entryTime])

  const drawerPortalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setRange('year')
  }, [open])

  const { title, description } = buildHeaderText(range, data)

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="text-balance">{description}</DrawerDescription>
            <div ref={drawerPortalRef} className="mt-1 flex justify-end">
              <RangeSwitcher
                value={range}
                onChange={setRange}
                entryDate={entryDate}
                entryDateMissing={!entryDate}
                container={drawerPortalRef}
              />
            </div>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-6">
            <UtYearlyChart data={data} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  const switcher = (
    <RangeSwitcher
      value={range}
      onChange={setRange}
      entryDate={entryDate}
      entryDateMissing={!entryDate}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-h-[90vh] sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-balance">{description}</DialogDescription>
            </div>
            {switcher}
          </div>
        </DialogHeader>
        <UtYearlyChart data={data} />
      </DialogContent>
    </Dialog>
  )
}

function buildHeaderText(
  range: UtRange,
  data: YearlyUtData,
): {
  title: string
  description: string
} {
  if (range === 'month') {
    const monthStr = format(data.start, 'yyyy-MM')
    return {
      title: '本月项目工时',
      description: `本月（${monthStr}）各项目的周度投入趋势（仅统计已确认）`,
    }
  }
  if (range === 'all') {
    if (data.entryDateMissing) {
      return {
        title: '入职以来项目工时',
        description: '未获取到入职时间，已回退展示今年至今的趋势',
      }
    }
    const startStr = format(data.start, 'yyyy-MM-dd')
    const granularityLabel = data.granularity === 'year' ? '年' : '月'
    return {
      title: '入职以来项目工时',
      description: `${startStr} 至今各项目的${granularityLabel}度投入趋势（仅统计已确认）`,
    }
  }
  const endYear = data.end.getFullYear()
  return {
    title: `${endYear} 年项目工时`,
    description: '今年至今各项目的月度投入趋势（仅统计已确认）',
  }
}
