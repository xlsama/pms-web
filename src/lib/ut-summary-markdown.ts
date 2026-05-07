import type { UtSummaryData } from '@/hooks/use-ut-summary'

export interface UtSummaryMeta {
  rangeLabel: string
  userName?: string
}

export function buildUtSummaryMarkdown(data: UtSummaryData, meta: UtSummaryMeta): string {
  const lines: Array<string> = []
  lines.push('# UT 工时总结')
  lines.push('')

  const headerParts: Array<string> = [
    `范围：${data.range.start} 至 ${data.range.end}（${meta.rangeLabel}）`,
  ]
  if (meta.userName) headerParts.unshift(`成员：${meta.userName}`)
  lines.push(`> ${headerParts.join(' · ')}`)

  if (data.projects.length === 0) {
    lines.push('')
    lines.push('该时间范围内暂无已确认的工时记录。')
    lines.push('')
    return lines.join('\n')
  }

  const totalManDays = round1(data.totalUt / 8)
  lines.push(`> 共 ${data.projects.length} 个项目 · 合计 ${data.totalUt}h / ${totalManDays} 人天`)
  lines.push('')

  for (const project of data.projects) {
    lines.push(`## ${project.projectName}`)
    lines.push('')
    lines.push('| 月份 | 工时(h) | 人天 |')
    lines.push('|---|---:|---:|')
    for (const row of project.monthly) {
      const md = round1(row.ut / 8)
      lines.push(`| ${row.monthKey} | ${row.ut.toFixed(1)} | ${md.toFixed(1)} |`)
    }
    lines.push('')
    const projectManDays = round1(project.totalUt / 8)
    lines.push(
      `**${project.projectName} 合计：${project.totalUt.toFixed(1)}h / ${projectManDays.toFixed(1)} 人天**`,
    )
    lines.push('')
  }

  return lines.join('\n')
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
