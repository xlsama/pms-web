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
import { useYearlyUtData } from '@/hooks/use-yearly-ut'

import { UtYearlyChart } from './ut-yearly-chart'

interface UtYearlyChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UtYearlyChartDialog({ open, onOpenChange }: UtYearlyChartDialogProps) {
  const isMobile = useIsMobile()
  const data = useYearlyUtData(open)

  const title = `${data.year} 年项目工时`
  const description = '今年至今各项目的月度投入趋势（仅统计已确认）'

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-auto px-4 pb-6">
            <UtYearlyChart data={data} />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-h-[90vh] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <UtYearlyChart data={data} />
      </DialogContent>
    </Dialog>
  )
}
