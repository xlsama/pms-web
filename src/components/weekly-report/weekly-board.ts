import type { WeeklyActualUt, WeeklyUtStatus } from '@/api/weekly-report'

/**
 * 周报甘特图的数据合并层：把「我排的计划」和「UT 日历里的实际填报」合成一张图。
 *
 * 两条铁律：
 * 1. 实际优先——同一格既有计划又有已提交 UT 时，按实际展示并锁死。
 * 2. 周报只读取实际 UT，永远不写入；计划只存周报自己的表。
 */

/** 一天的 UT 上限 1.0、最小单位 0.1。额度统一按十分位整数计算，避免浮点累加误差。 */
const DAY_QUOTA_TENTHS = 10

/** 格子状态：plan 来自周报草稿，其余三种来自 UT 日历 */
export type CellKind = 'plan' | WeeklyUtStatus

/** 已提交：锁死格子且占用当天额度。rejected 待重填，既不锁也不占额度。 */
export function isSubmitted(status: CellKind): boolean {
  return status === 'check' || status === 'confirmed'
}

export function cellKey(projectId: number, workDate: string): string {
  return `${projectId}@${workDate}`
}

export interface BoardCell {
  workDate: string
  workday: boolean
  /** 草稿里是否排了这个项目；已提交的格子不进草稿，故此处为 false */
  assigned: boolean
  /** null 表示该格空白 */
  kind: CellKind | null
  /** kind 为实际状态时的 UT 值 */
  actualUt: number
  /** kind 为 plan 时按额度均分出的预估 UT；0 表示当天额度已被实际 UT 占满 */
  plannedUt: number
  /** 已提交，不可拖动 / 不可取消 */
  locked: boolean
  /** 排了计划但当天额度已被实际 UT 占满，分不到 UT——计划没兑现 */
  unfulfilled: boolean
}

export interface BoardProject {
  projectId: number
  projectName: string
  projectCode: string | null
  planContent: string | null
  /** 本周只在 UT 日历里出现过、周报没排过——这种行是既成事实，不能删 */
  actualOnly: boolean
  days: Array<BoardCell>
}

export interface DayQuota {
  workDate: string
  workday: boolean
  /** 已通过占用 */
  confirmedUt: number
  /** 待审批占用 */
  checkUt: number
  /** 已提交占用（check + confirmed） */
  usedUt: number
  /** 剩余可计划额度 = 1.0 − usedUt */
  remainingUt: number
  /** 当天计划格子数 */
  planCount: number
  /** 计划实际分到的额度合计（planCount > 0 时等于 remainingUt） */
  plannedUt: number
  /** 还能再排几个项目 = 剩余额度 ÷ 0.1 − 已排数 */
  addableCount: number
}

export interface WeeklyBoard {
  projects: Array<BoardProject>
  quotaByDate: Map<string, DayQuota>
}

export interface BoardDraftProject {
  projectId: number
  projectName: string
  projectCode: string | null
  planContent: string | null
  days: Array<{ workDate: string; assigned: boolean }>
}

interface WeekDay {
  workDate: string
  workday: boolean
}

interface MergedActual {
  projectId: number
  projectName: string
  workDate: string
  kind: WeeklyUtStatus
  val: number
}

const toTenths = (value: number) => Math.round(value * 10)

/** 把剩余额度按 0.1 粒度均分给 n 个计划项目，余数从前往后各多分 0.1 */
function splitTenths(totalTenths: number, count: number): Array<number> {
  if (count <= 0) return []
  const base = Math.floor(totalTenths / count)
  const extra = totalTenths % count
  return Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0))
}

/**
 * 合并同一项目同一天的多条填报。
 * 状态优先级：待审批 > 已通过 > 已驳回——只要还有一条没批完，整格就算未落定；
 * 已驳回的记录不与已提交的相加（它需要重填，不代表已花掉的额度）。
 */
function mergeActuals(actuals: Array<WeeklyActualUt>): Map<string, MergedActual> {
  const merged = new Map<string, MergedActual>()
  for (const actual of actuals) {
    const key = cellKey(actual.projectId, actual.workDate)
    const current = merged.get(key)
    const incoming: MergedActual = {
      projectId: actual.projectId,
      projectName: actual.projectName,
      workDate: actual.workDate,
      kind: actual.status,
      val: actual.val ?? 0,
    }
    if (!current) {
      merged.set(key, incoming)
      continue
    }
    const currentSubmitted = isSubmitted(current.kind)
    const incomingSubmitted = isSubmitted(incoming.kind)
    if (currentSubmitted && incomingSubmitted) {
      merged.set(key, {
        ...current,
        kind: current.kind === 'check' || incoming.kind === 'check' ? 'check' : 'confirmed',
        val: current.val + incoming.val,
      })
    } else if (!currentSubmitted && incomingSubmitted) {
      merged.set(key, incoming)
    } else if (!currentSubmitted && !incomingSubmitted) {
      merged.set(key, { ...current, val: current.val + incoming.val })
    }
    // 已有已提交记录、又来一条已驳回：保持已提交不变
  }
  return merged
}

/**
 * 合成甘特图数据。
 *
 * 行序 = 草稿里的项目（保持排列顺序）+ 只在实际 UT 里出现过的项目（按首次出现的日期）。
 * 当天的计划项目按行序均分剩余额度，所以行序同时决定了预估 UT 的分配顺序。
 */
export function buildWeeklyBoard({
  draft,
  actuals,
  weekDays,
}: {
  draft: Array<BoardDraftProject>
  actuals: Array<WeeklyActualUt>
  weekDays: Array<WeekDay>
}): WeeklyBoard {
  const workdayByDate = new Map(weekDays.map(day => [day.workDate, day.workday]))
  const merged = mergeActuals(actuals)

  // 每天已提交占用的额度，按状态分开记以便容量条分段着色
  const confirmedTenthsByDate = new Map<string, number>()
  const checkTenthsByDate = new Map<string, number>()
  for (const actual of merged.values()) {
    if (!isSubmitted(actual.kind)) continue
    const bucket = actual.kind === 'confirmed' ? confirmedTenthsByDate : checkTenthsByDate
    bucket.set(actual.workDate, (bucket.get(actual.workDate) ?? 0) + toTenths(actual.val))
  }

  // 行序：草稿在前，只有实际 UT 的项目补在后面
  const draftIds = new Set(draft.map(project => project.projectId))
  const extraProjects: Array<{ projectId: number; projectName: string }> = []
  const seenExtra = new Set<number>()
  for (const day of weekDays) {
    for (const actual of merged.values()) {
      if (actual.workDate !== day.workDate) continue
      if (draftIds.has(actual.projectId) || seenExtra.has(actual.projectId)) continue
      seenExtra.add(actual.projectId)
      extraProjects.push({ projectId: actual.projectId, projectName: actual.projectName })
    }
  }

  const rows: Array<BoardProject> = [
    ...draft.map(project => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectCode: project.projectCode,
      planContent: project.planContent,
      actualOnly: false,
      assignedDates: new Set(project.days.filter(day => day.assigned).map(day => day.workDate)),
    })),
    ...extraProjects.map(project => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectCode: null,
      planContent: null,
      actualOnly: true,
      assignedDates: new Set<string>(),
    })),
  ].map(row => ({
    projectId: row.projectId,
    projectName: row.projectName,
    projectCode: row.projectCode,
    planContent: row.planContent,
    actualOnly: row.actualOnly,
    days: weekDays.map<BoardCell>(day => {
      const actual = merged.get(cellKey(row.projectId, day.workDate))
      const locked = actual ? isSubmitted(actual.kind) : false
      const assigned = row.assignedDates.has(day.workDate) && !locked
      const kind: CellKind | null = actual ? actual.kind : assigned ? 'plan' : null
      return {
        workDate: day.workDate,
        workday: day.workday,
        assigned,
        kind,
        actualUt: actual ? actual.val : 0,
        plannedUt: 0,
        locked,
        unfulfilled: false,
      }
    }),
  }))

  // 逐天把剩余额度均分给计划格子（行序即分配顺序）
  const quotaByDate = new Map<string, DayQuota>()
  weekDays.forEach((day, dayIndex) => {
    const confirmedTenths = Math.max(0, confirmedTenthsByDate.get(day.workDate) ?? 0)
    const checkTenths = Math.max(0, checkTenthsByDate.get(day.workDate) ?? 0)
    const usedTenths = Math.min(DAY_QUOTA_TENTHS, confirmedTenths + checkTenths)
    const remainingTenths = DAY_QUOTA_TENTHS - usedTenths
    // 已驳回的格子也属于草稿、同样参与分配，故按 assigned 而非 kind 判断
    const planCells = rows.map(row => row.days[dayIndex]).filter(cell => cell.assigned)
    const shares = splitTenths(remainingTenths, planCells.length)
    planCells.forEach((cell, index) => {
      cell.plannedUt = shares[index] / 10
      cell.unfulfilled = cell.plannedUt === 0
    })
    quotaByDate.set(day.workDate, {
      workDate: day.workDate,
      workday: workdayByDate.get(day.workDate) ?? true,
      confirmedUt: Math.min(DAY_QUOTA_TENTHS, confirmedTenths) / 10,
      checkUt: Math.max(0, usedTenths - confirmedTenths) / 10,
      usedUt: usedTenths / 10,
      remainingUt: remainingTenths / 10,
      planCount: planCells.length,
      plannedUt: planCells.length > 0 ? remainingTenths / 10 : 0,
      addableCount: Math.max(0, remainingTenths - planCells.length),
    })
  })

  return {
    // 既没排计划、也没填过 UT 的项目不占一行
    projects: rows.filter(row => row.days.some(cell => cell.kind !== null)),
    quotaByDate,
  }
}

/** 已提交 UT 的格子集合：草稿层用它剔除锁死的计划，避免把只读格子回传给保存接口 */
export function buildLockedCells(actuals: Array<WeeklyActualUt>): Set<string> {
  const locked = new Set<string>()
  for (const actual of mergeActuals(actuals).values()) {
    if (isSubmitted(actual.kind)) locked.add(cellKey(actual.projectId, actual.workDate))
  }
  return locked
}
