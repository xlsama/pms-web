import { Popover, PopoverContent } from '@/components/ui/popover'
import { useUtStore } from '@/stores/ut'
import type { DailyData, Project } from '@/types/ut'

import { UtForm } from '../form/ut-form'

interface UtDayPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  projects: Array<Project>
  dailyData?: DailyData
  anchorEl: HTMLElement | null
}

export function UtDayPopover({
  open,
  onOpenChange,
  date,
  projects,
  dailyData,
  anchorEl,
}: UtDayPopoverProps) {
  const { prefilledProject, setPrefilledProject, setSelectedDate } = useUtStore()

  function handleClose(): void {
    onOpenChange(false)
    setPrefilledProject(null)
    setSelectedDate(null)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails.reason === 'outside-press') {
          const target = eventDetails.event.target as HTMLElement | null
          const dayCell = target?.closest('[data-date]')
          if (dayCell && !dayCell.hasAttribute('data-rest')) {
            eventDetails.cancel()
            return
          }
        }
        onOpenChange(nextOpen)
      }}
    >
      <PopoverContent
        anchor={anchorEl}
        className="max-h-[calc(var(--available-height)-1rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto p-6 lg:max-w-lg"
        align="start"
        initialFocus={false}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">填写 UT</h2>
        </div>
        <UtForm
          date={date}
          projects={projects}
          existingAllocations={dailyData?.records}
          prefilledProject={prefilledProject}
          onClose={handleClose}
          editable={dailyData?.editable ?? true}
        />
      </PopoverContent>
    </Popover>
  )
}
