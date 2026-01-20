import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { UtStatusBadge } from '../status/ut-status-badge'
import { ProjectSelect } from './project-select'
import { UtValueInput } from './ut-value-input'
import type { Project, UtAllocation } from '@/types/ut'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { UtStatus } from '@/types/ut'
import { useSubmitUt } from '@/hooks/use-ut'
import { cn } from '@/lib/utils'

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
  projectId: number | null
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
  const submitUt = useSubmitUt()

  // Initialize allocations from existing or prefilled
  useEffect(() => {
    if (existingAllocations.length > 0) {
      setAllocations(
        existingAllocations.map(a => ({
          id: a.id,
          projectId: a.projectId,
          projectName: a.projectName,
          value: a.value,
        })),
      )
    } else if (prefilledProject) {
      setAllocations([
        {
          projectId: prefilledProject.id,
          projectName: prefilledProject.name,
          value: 0.5,
        },
      ])
    } else {
      setAllocations([{ projectId: null, projectName: '', value: 0.5 }])
    }
  }, [existingAllocations, prefilledProject])

  const totalUt = allocations.reduce((sum, a) => sum + a.value, 0)
  const isValid = totalUt === 1 && allocations.every(a => a.projectId !== null)

  const addAllocation = () => {
    setAllocations([...allocations, { projectId: null, projectName: '', value: 0.25 }])
  }

  const removeAllocation = (index: number) => {
    if (allocations.length > 1) {
      setAllocations(allocations.filter((_, i) => i !== index))
    }
  }

  const updateAllocation = (index: number, updates: Partial<AllocationItem>) => {
    setAllocations(allocations.map((a, i) => (i === index ? { ...a, ...updates } : a)))
  }

  const handleSubmit = () => {
    if (!isValid) {
      toast.error('请确保总计为 1 UT 且所有项目已选择')
      return
    }

    const list = allocations.map(a => ({
      date,
      projectId: a.projectId!,
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
  const overallStatus = existingAllocations[0]?.status || UtStatus.None
  const canEdit = editable && !hasConfirmed

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{formattedDate}</p>
          {existingAllocations.length > 0 && (
            <UtStatusBadge status={overallStatus} className="mt-1" />
          )}
        </div>
        <div
          className={cn(
            'text-lg font-bold',
            totalUt === 1
              ? 'text-green-600'
              : totalUt > 1
                ? 'text-red-600'
                : 'text-muted-foreground',
          )}
        >
          {totalUt} / 1 UT
        </div>
      </div>

      <div className="space-y-3">
        {allocations.map((allocation, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">项目 {index + 1}</Label>
              {allocations.length > 1 && canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => removeAllocation(index)}
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>

            <ProjectSelect
              projects={projects}
              value={allocation.projectId ?? undefined}
              onChange={(projectId, projectName) =>
                updateAllocation(index, { projectId, projectName })
              }
              disabled={!canEdit}
            />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">UT 数量</Label>
              <UtValueInput
                value={allocation.value}
                onChange={value => updateAllocation(index, { value })}
                disabled={!canEdit}
              />
            </div>
          </div>
        ))}
      </div>

      {canEdit && totalUt < 1 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addAllocation}
        >
          <Plus className="mr-1 size-4" />
          添加项目
        </Button>
      )}

      {canEdit && (
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!isValid || submitUt.isPending}
          >
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
