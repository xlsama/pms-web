import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { Popover } from '@/components/ui/popover'
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
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchorEl}
          align="start"
          sideOffset={4}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            data-slot="popover-content"
            initialFocus={false}
            className="z-50 flex max-h-[calc(var(--available-height)-1rem)] w-[calc(100vw-2rem)] max-w-md origin-(--transform-origin) flex-col gap-2.5 overflow-y-auto rounded-lg bg-popover p-6 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 lg:max-w-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <UtForm
              date={date}
              projects={projects}
              existingAllocations={dailyData?.records}
              prefilledProject={prefilledProject}
              onClose={handleClose}
              editable={dailyData?.editable ?? true}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </Popover>
  )
}
