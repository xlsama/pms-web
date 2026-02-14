import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Project } from '@/types/ut'

interface ProjectSelectProps {
  projects: Array<Project>
  value?: number
  onChange: (projectId: number, projectName: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ProjectSelect({
  projects,
  value,
  onChange,
  disabled,
  placeholder = '选择项目',
}: ProjectSelectProps) {
  return (
    <Select
      value={value?.toString()}
      onValueChange={v => {
        const project = projects.find(p => p.id.toString() === v)
        if (project) {
          onChange(project.id, project.name)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {projects.map(project => (
          <SelectItem key={project.id} value={project.id.toString()}>
            <div className="flex items-center justify-between gap-2">
              <span>{project.name}</span>
              <span className="text-xs text-muted-foreground">
                剩余 {project.manDaysRemaining} UT
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
