import { UtForm } from '../form/ut-form'
import type { DailyUtSummary, Project } from '@/types/ut'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

interface UtDayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  projects: Array<Project>
  summary?: DailyUtSummary
}

export function UtDayDrawer({ open, onOpenChange, date, projects, summary }: UtDayDrawerProps) {
  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>填写 UT</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-auto p-4">
          <UtForm
            date={date}
            projects={projects}
            existingAllocations={summary?.allocations}
            onClose={handleClose}
            editable={summary?.editable ?? true}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
