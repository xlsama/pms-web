import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import type { DailyData, Project } from '@/types/ut'

import { UtForm } from '../form/ut-form'

interface UtDayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  projects: Array<Project>
  dailyData?: DailyData
}

export function UtDayDrawer({ open, onOpenChange, date, projects, dailyData }: UtDayDrawerProps) {
  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="sr-only">填写 UT</DrawerTitle>
        <div className="overflow-auto p-4 pt-6">
          <UtForm
            date={date}
            projects={projects}
            existingAllocations={dailyData?.records}
            onClose={handleClose}
            editable={dailyData?.editable ?? true}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
