import { UtStatus } from '@/types/ut'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UtStatusBadgeProps {
  status: UtStatus
  className?: string
}

const statusConfig = {
  [UtStatus.None]: {
    label: '未提交',
    variant: 'outline' as const,
    className: 'text-muted-foreground',
  },
  [UtStatus.Check]: {
    label: '待审批',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  [UtStatus.Confirmed]: {
    label: '已通过',
    variant: 'secondary' as const,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  [UtStatus.Rejected]: {
    label: '已驳回',
    variant: 'destructive' as const,
    className: '',
  },
}

export function UtStatusBadge({ status, className }: UtStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[UtStatus.None]

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}

export function UtStatusDot({ status, className }: UtStatusBadgeProps) {
  const dotColors = {
    [UtStatus.None]: 'bg-muted',
    [UtStatus.Check]: 'bg-yellow-500',
    [UtStatus.Confirmed]: 'bg-green-500',
    [UtStatus.Rejected]: 'bg-red-500',
  }

  return (
    <span
      className={cn(
        'inline-block size-2 rounded-full',
        dotColors[status] || dotColors[UtStatus.None],
        className,
      )}
    />
  )
}
