import { format, getISOWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSubmitUt } from '@/hooks/use-ut'
import { isLeaveProject } from '@/lib/ut-utils'
import { cn } from '@/lib/utils'
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
  type?: string
  status?: UtStatus
}

function AllocationCard({
  allocation,
  disabled,
  maxValue,
  onChange,
}: {
  allocation: AllocationItem
  disabled: boolean
  maxValue: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{allocation.projectName}</span>
        {allocation.value > 0 && (
          <span className="shrink-0 text-sm font-medium text-primary">{allocation.value} UT</span>
        )}
      </div>

      <UtValueInput
        value={allocation.value}
        onChange={onChange}
        disabled={disabled}
        maxValue={maxValue}
      />
    </div>
  )
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
  const [leaveAccordion, setLeaveAccordion] = useState<string>('')
  const submitUt = useSubmitUt()

  // Initialize allocations from existing or create default for all projects
  useEffect(() => {
    if (projects.length === 0 || hasInitialized) return

    const existingMap = new Map(existingAllocations.map(a => [a.projectId, a]))

    // Only include projects with remaining UT or existing allocations
    const availableProjects = projects.filter(p => p.manDaysRemaining > 0 || existingMap.has(p.id))

    const items = availableProjects.map(p => {
      const existing = existingMap.get(p.id)
      const isPrefilled = prefilledProject?.id === p.id
      const maxDefault = Math.floor(p.manDaysRemaining * 10) / 10
      const defaultValue = isPrefilled && !existing ? Math.min(1, maxDefault) : 0

      return {
        id: existing?.id,
        projectId: p.id,
        projectName: p.name,
        value: existing?.value ?? defaultValue,
        type: existing?.type,
        status: existing?.status,
      }
    })

    // Sort: projects with existing value first, then by remaining UT descending
    const remainingMap = new Map(availableProjects.map(p => [p.id, p.manDaysRemaining]))
    items.sort((a, b) => {
      const hasValueDiff = (b.value > 0 ? 1 : 0) - (a.value > 0 ? 1 : 0)
      if (hasValueDiff !== 0) return hasValueDiff
      return (remainingMap.get(b.projectId) ?? 0) - (remainingMap.get(a.projectId) ?? 0)
    })

    setAllocations(items)
    setHasInitialized(true)
  }, [existingAllocations, projects, prefilledProject, hasInitialized])

  const { regularAllocations, leaveAllocations } = useMemo(() => {
    const regular: Array<AllocationItem> = []
    const leave: Array<AllocationItem> = []
    for (const a of allocations) {
      if (isLeaveProject(a.projectName)) {
        leave.push(a)
      } else {
        regular.push(a)
      }
    }
    return { regularAllocations: regular, leaveAllocations: leave }
  }, [allocations])

  // Auto-expand leave accordion when leave allocations have values
  useEffect(() => {
    if (leaveAllocations.some(a => a.value > 0)) {
      setLeaveAccordion('leave')
    }
  }, [hasInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only count allocations with value > 0
  const activeAllocations = allocations.filter(a => a.value > 0)
  const totalUt = activeAllocations.reduce((sum, a) => sum + a.value, 0)
  const roundedTotal = Math.round(totalUt * 10) / 10
  const isValid = roundedTotal === 1

  function getMaxValue(projectId: number): number {
    // 当日剩余可分配额度
    const otherTotal = allocations
      .filter(a => a.projectId !== projectId)
      .reduce((sum, a) => sum + a.value, 0)
    const dailyMax = Math.round((1 - otherTotal) * 10) / 10

    // 项目级剩余 UT（manDaysRemaining 已扣除今天的已有分配，需加回来）
    const project = projects.find(p => p.id === projectId)
    if (!project) return dailyMax

    const existingValue = existingAllocations.find(a => a.projectId === projectId)?.value ?? 0
    const projectMax = Math.round((project.manDaysRemaining + existingValue) * 10) / 10

    return Math.min(dailyMax, projectMax)
  }

  function updateAllocation(projectId: number, value: number): void {
    setAllocations(prev => prev.map(a => (a.projectId === projectId ? { ...a, value } : a)))
  }

  function resetAllocations(): void {
    setAllocations(prev =>
      prev.map(a =>
        a.status === UtStatus.Confirmed || a.status === UtStatus.Check ? a : { ...a, value: 0 },
      ),
    )
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
      status: a.status || UtStatus.Check,
      type: a.type || '1',
      utType: 0,
      val: a.value,
    }))

    submitUt.mutate(
      { weekIndex: getISOWeek(new Date(date)), list },
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

  const dateObj = new Date(date)
  const formattedDay = format(dateObj, 'M月d日')
  const formattedWeekday = format(dateObj, 'EEEE', { locale: zhCN })

  // Check if status is confirmed (not editable)
  const hasConfirmed = existingAllocations.some(a => a.status === UtStatus.Confirmed)
  const canEdit = editable

  if (projects.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">暂无可用项目</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {formattedDay} <span className="text-xs text-muted-foreground">{formattedWeekday}</span>
          </p>
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
        {regularAllocations.map(allocation => (
          <AllocationCard
            key={allocation.projectId}
            allocation={allocation}
            disabled={
              !canEdit ||
              allocation.status === UtStatus.Confirmed ||
              allocation.status === UtStatus.Check
            }
            maxValue={getMaxValue(allocation.projectId)}
            onChange={value => updateAllocation(allocation.projectId, value)}
          />
        ))}

        {leaveAllocations.length > 0 && (
          <Accordion
            type="single"
            collapsible
            value={leaveAccordion}
            onValueChange={setLeaveAccordion}
          >
            <AccordionItem value="leave" className="border-none">
              <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                请假项目
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="space-y-3">
                  {leaveAllocations.map(allocation => (
                    <AllocationCard
                      key={allocation.projectId}
                      allocation={allocation}
                      disabled={
                        !canEdit ||
                        allocation.status === UtStatus.Confirmed ||
                        allocation.status === UtStatus.Check
                      }
                      maxValue={getMaxValue(allocation.projectId)}
                      onChange={value => updateAllocation(allocation.projectId, value)}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
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
      {!canEdit && !hasConfirmed && existingAllocations.some(a => a.status === UtStatus.Check) && (
        <p className="text-center text-xs text-muted-foreground">审批中，不可修改</p>
      )}
    </div>
  )
}
