import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UtValueInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  maxValue: number
}

const UT_VALUES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1] as const

export function UtValueInput({ value, onChange, disabled, maxValue }: UtValueInputProps) {
  // Filter out values that exceed maxValue (instead of disabling them)
  const availableValues = UT_VALUES.filter(v => v <= maxValue)

  return (
    <div className="flex flex-wrap gap-1">
      {availableValues.map(v => {
        const isSelected = value === v

        return (
          <Button
            key={v}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 min-w-[2.5rem] px-2 text-xs',
              isSelected && 'ring-2 ring-primary ring-offset-1',
            )}
            onClick={() => onChange(isSelected ? 0 : v)}
            disabled={disabled}
          >
            {v}
          </Button>
        )
      })}
    </div>
  )
}
