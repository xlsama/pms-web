import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UtRange } from '@/hooks/use-yearly-ut'

const RANGE_LABEL: Record<UtRange, string> = {
  year: '今年',
  month: '本月',
  all: '入职以来',
}

interface RangeSwitcherProps {
  value: UtRange
  onChange: (value: UtRange) => void
  entryDate?: Date | null
  entryDateMissing?: boolean
  container?: React.RefObject<HTMLElement | null> | HTMLElement | null
}

export function RangeSwitcher({
  value,
  onChange,
  entryDate,
  entryDateMissing,
  container,
}: RangeSwitcherProps) {
  const entryDateStr = entryDate ? format(entryDate, 'yyyy-MM-dd') : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1">
            {RANGE_LABEL[value]}
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48" container={container}>
        <DropdownMenuRadioGroup value={value} onValueChange={v => onChange(v as UtRange)}>
          <DropdownMenuRadioItem value="year" closeOnClick>
            今年
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month" closeOnClick>
            本月
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all" disabled={entryDateMissing} closeOnClick>
            <span className="flex-1 whitespace-nowrap">入职以来</span>
            {entryDateStr && (
              <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground">
                {entryDateStr} 起
              </span>
            )}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
