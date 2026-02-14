import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSubmitUt } from '@/hooks/use-ut'
import { cn } from '@/lib/utils'
import { useUtStore } from '@/stores/ut'
import type { Project, UtAllocation } from '@/types/ut'
import { UtStatus } from '@/types/ut'

import { UtValueInput } from './ut-value-input'

function getTotalColorClass(total: number): string {
  if (total === 1) return 'text-green-600'
  if (total > 1) return 'text-red-600'
  return 'text-muted-foreground'
}

interface UtFormProps {
  date: string
  projects: Array<Project>
  existingAllocations?: Array<UtAllocation>
  prefilledProject?: Project | null
  onClose?: () => void
  editable?: boolean
}

interface AllocationItem {
  id?: number
  projectId: number
  projectName: string
  value: number
}

export function UtForm({
  date,
  projects,
  existingAllocations = [],
  prefilledProject,
  onClose,
  editable = true,
}: UtFormProps) {
  const [allocations, setAllocations] = useState<Array<AllocationItem>>([])
  const [hasInitialized, setHasInitialized] = useState(false)
  const submitUt = useSubmitUt()

  // Get projects from store as fallback
  const storeProjects = useUtStore(s => s.projects)
  const projectList = projects.length > 0 ? projects : storeProjects

  // Initialize allocations from existing or create default for all projects
  useEffect(() => {
    if (projectList.length === 0 || hasInitialized) return

    const existingMap = new Map(existingAllocations.map(a => [a.projectId, a]))

    setAllocations(
      projectList.map(p => {
        const existing = existingMap.get(p.id)
        const isPrefilled = prefilledProject?.id === p.id
        const defaultValue = isPrefilled && !existing ? 1 : 0

        return {
          id: existing?.id,
          projectId: p.id,
          projectName: p.name,
          value: existing?.value ?? defaultValue,
        }
      }),
    )
    setHasInitialized(true)
  }, [existingAllocations, projectList, prefilledProject, hasInitialized])

  // Only count allocations with value > 0
  const activeAllocations = allocations.filter(a => a.value > 0)
  const totalUt = activeAllocations.reduce((sum, a) => sum + a.value, 0)
  const roundedTotal = Math.round(totalUt * 10) / 10
  const isValid = roundedTotal === 1

  function getMaxValue(projectId: number): number {
    const otherTotal = allocations
      .filter(a => a.projectId !== projectId)
      .reduce((sum, a) => sum + a.value, 0)
    return Math.round((1 - otherTotal) * 10) / 10
  }

  function updateAllocation(projectId: number, value: number): void {
    setAllocations(prev => prev.map(a => (a.projectId === projectId ? { ...a, value } : a)))
  }

  function resetAllocations(): void {
    setAllocations(prev => prev.map(a => ({ ...a, value: 0 })))
  }

  function handleSubmit(): void {
    if (!isValid) {
      toast.error('请确保总计为 1 UT')
      return
    }

    // Only submit allocations with value > 0
    const list = activeAllocations.map(a => ({
      date,
      projectId: a.projectId,
      projectName: a.projectName,
      status: UtStatus.Check,
      type: '1',
      utType: 1,
      val: a.value,
    }))

    submitUt.mutate(
      { list },
      {
        onSuccess: () => {
          toast.success('提交成功')
          onClose?.()
        },
        onError: () => {
          toast.error('提交失败，请重试')
        },
      },
    )
  }

  const formattedDate = format(new Date(date), 'M月d日 EEEE', { locale: zhCN })

  // Check if status is confirmed (not editable)
  const hasConfirmed = existingAllocations.some(a => a.status === UtStatus.Confirmed)
  const canEdit = editable && !hasConfirmed

  if (projectList.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">暂无可用项目</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && totalUt > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={resetAllocations}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置</TooltipContent>
            </Tooltip>
          )}
          <div className={cn('text-lg font-bold', getTotalColorClass(roundedTotal))}>
            {roundedTotal} / 1 UT
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {allocations.map(allocation => (
          <div key={allocation.projectId} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{allocation.projectName}</span>
              {allocation.value > 0 && (
                <span className="text-sm font-medium text-primary">{allocation.value} UT</span>
              )}
            </div>

            <UtValueInput
              value={allocation.value}
              onChange={value => updateAllocation(allocation.projectId, value)}
              disabled={!canEdit}
              maxValue={getMaxValue(allocation.projectId)}
            />
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleSubmit} disabled={!isValid || submitUt.isPending}>
            {submitUt.isPending ? '提交中...' : '提交'}
          </Button>
        </div>
      )}

      {!canEdit && hasConfirmed && (
        <p className="text-center text-xs text-muted-foreground">已审批通过，不可修改</p>
      )}
    </div>
  )
}
