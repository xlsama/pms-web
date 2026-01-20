import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UtForm } from '../form/ut-form'
import { useUtStore } from '@/stores/ut'
import type { Project, DailyUtSummary } from '@/types/ut'

interface UtDayPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  projects: Project[]
  summary?: DailyUtSummary
}

export function UtDayPopover({ open, onOpenChange, date, projects, summary }: UtDayPopoverProps) {
  const { prefilledProject, setPrefilledProject, setSelectedDate } = useUtStore()

  const handleClose = () => {
    onOpenChange(false)
    setPrefilledProject(null)
    setSelectedDate(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>填写 UT</DialogTitle>
        </DialogHeader>
        <UtForm
          date={date}
          projects={projects}
          existingAllocations={summary?.allocations}
          prefilledProject={prefilledProject}
          onClose={handleClose}
          editable={summary?.editable ?? true}
        />
      </DialogContent>
    </Dialog>
  )
}
