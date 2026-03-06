import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRejectedUt } from '@/hooks/use-ut'

interface RejectedUtDialogProps {
  rejectedCount: number
}

export function RejectedUtDialog({ rejectedCount }: RejectedUtDialogProps) {
  const { data, isPending } = useRejectedUt()

  const groupedByProject = useMemo(() => {
    if (!data) return []
    const map = new Map<number, { projectName: string; total: number }>()
    for (const item of data) {
      const existing = map.get(item.projectId)
      if (existing) {
        existing.total += item.val
      } else {
        map.set(item.projectId, { projectName: item.projectName, total: item.val })
      }
    }
    return Array.from(map.values())
  }, [data])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge className="cursor-pointer border-transparent bg-red-100 px-2 py-0.5 text-xs text-red-700 transition-colors hover:bg-red-200/50 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/50">
          驳回:
          <span className="ml-0.5 font-semibold tabular-nums">{rejectedCount}</span>
        </Badge>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>驳回 UT</DialogTitle>
          <DialogDescription>按项目分组的驳回工时统计</DialogDescription>
        </DialogHeader>
        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : groupedByProject.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无驳回记录</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead className="w-[100px] text-right">驳回 UT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedByProject.map(item => (
                <TableRow key={item.projectName}>
                  <TableCell>{item.projectName}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
