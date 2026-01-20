import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface UtValueInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

const UT_VALUES = [0.1, 0.5, 1] as const

export function UtValueInput({ value, onChange, disabled }: UtValueInputProps) {
  const isPreset = UT_VALUES.includes(value as (typeof UT_VALUES)[number])
  const [showCustomInput, setShowCustomInput] = useState(!isPreset && value !== 0)
  const [customValue, setCustomValue] = useState(isPreset ? '' : String(value))

  const handlePresetClick = (v: number) => {
    setShowCustomInput(false)
    setCustomValue('')
    onChange(v)
  }

  const handleCustomClick = () => {
    setShowCustomInput(true)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setCustomValue(input)

    const num = parseFloat(input)
    if (!isNaN(num) && num >= 0.1 && num <= 1) {
      onChange(num)
    }
  }

  return (
    <div className="flex gap-1">
      {UT_VALUES.map(v => (
        <Button
          key={v}
          type="button"
          variant={value === v && !showCustomInput ? 'default' : 'outline'}
          size="sm"
          className={cn('flex-1', value === v && !showCustomInput && 'ring-2 ring-primary ring-offset-2')}
          onClick={() => handlePresetClick(v)}
          disabled={disabled}
        >
          {v}
        </Button>
      ))}
      {showCustomInput ? (
        <Input
          type="number"
          step="0.1"
          min="0.1"
          max="1"
          value={customValue}
          onChange={handleCustomChange}
          disabled={disabled}
          className="h-8 w-16 flex-1 text-center"
          autoFocus
        />
      ) : (
        <Button
          type="button"
          variant={!isPreset && value !== 0 ? 'default' : 'outline'}
          size="sm"
          className={cn('flex-1', !isPreset && value !== 0 && 'ring-2 ring-primary ring-offset-2')}
          onClick={handleCustomClick}
          disabled={disabled}
        >
          自定义
        </Button>
      )}
    </div>
  )
}
