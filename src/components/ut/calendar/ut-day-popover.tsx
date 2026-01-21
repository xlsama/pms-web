import { UtForm } from '../form/ut-form'
import type { DailyUtSummary, Project } from '@/types/ut'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useUtStore } from '@/stores/ut'

interface UtDayPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  projects: Array<Project>
  summary?: DailyUtSummary
  anchorEl: HTMLElement | null
}

export function UtDayPopover({
  open,
  onOpenChange,
  date,
  projects,
  summary,
  anchorEl,
}: UtDayPopoverProps) {
  const { prefilledProject, setPrefilledProject, setSelectedDate } = useUtStore()

  const handleClose = () => {
    onOpenChange(false)
    setPrefilledProject(null)
    setSelectedDate(null)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {anchorEl && <PopoverAnchor virtualRef={{ current: anchorEl }} />}
      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-md p-6 lg:max-w-lg"
        align="start"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">填写 UT</h2>
        </div>
        <UtForm
          date={date}
          projects={projects}
          existingAllocations={summary?.allocations}
          prefilledProject={prefilledProject}
          onClose={handleClose}
          editable={summary?.editable ?? true}
        />
      </PopoverContent>
    </Popover>
  )
}
