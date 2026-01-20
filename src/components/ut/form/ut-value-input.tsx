import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UtValueInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const UT_VALUES = [0.25, 0.5, 0.75, 1] as const

export function UtValueInput({ value, onChange, disabled }: UtValueInputProps) {
  return (
    <div className="flex gap-1">
      {UT_VALUES.map(v => (
        <Button
          key={v}
          type="button"
          variant={value === v ? 'default' : 'outline'}
          size="sm"
          className={cn('flex-1', value === v && 'ring-2 ring-primary ring-offset-2')}
          onClick={() => onChange(v)}
          disabled={disabled}
        >
          {v}
        </Button>
      ))}
    </div>
  )
}
