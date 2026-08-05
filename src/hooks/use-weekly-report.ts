import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getDefaultWeeklyGroup,
  getSharedWeeklyOwners,
  getWeeklyPlan,
  getWeeklyProjectAnalytics,
  getWeeklyProjectOptions,
  getWeeklyUserOptions,
  saveDefaultWeeklyGroup,
  saveWeeklyPlan,
  type WeeklyPlanSaveRequest,
} from '@/api/weekly-report'

// 周报数据不缓存，每次都请求最新（与 UT 一致）
const NO_CACHE = { staleTime: 0, gcTime: 0 } as const

export const weeklyReportKeys = {
  all: ['weekly-report'] as const,
  detail: (ownerUserId: number, weekStart: string) =>
    [...weeklyReportKeys.all, 'detail', ownerUserId, weekStart] as const,
  projectOptions: (q: string) => [...weeklyReportKeys.all, 'project-options', q] as const,
  userOptions: (q: string, limit: number) =>
    [...weeklyReportKeys.all, 'user-options', q, limit] as const,
  group: () => [...weeklyReportKeys.all, 'group'] as const,
  sharedOwners: () => [...weeklyReportKeys.all, 'shared-owners'] as const,
  analytics: (
    projectId: number | null,
    from: string,
    to: string,
    owner?: { userId: number; weekStartDate: string },
  ) => [...weeklyReportKeys.all, 'analytics', projectId, from, to, owner ?? null] as const,
}

export const useWeeklyPlan = (ownerUserId: number, weekStart: string) =>
  useQuery({
    queryKey: weeklyReportKeys.detail(ownerUserId, weekStart),
    queryFn: () => getWeeklyPlan(ownerUserId, weekStart),
    ...NO_CACHE,
    // 切周/切人时先显示上次结果、同时请求最新，避免闪骨架屏；这是渲染层过渡，不是缓存
    placeholderData: keepPreviousData,
  })

export const useWeeklyProjectOptions = (q: string) =>
  useQuery({
    queryKey: weeklyReportKeys.projectOptions(q),
    queryFn: () => getWeeklyProjectOptions(q),
    ...NO_CACHE,
  })

export const useWeeklyUserOptions = (q: string, limit = 200) =>
  useQuery({
    queryKey: weeklyReportKeys.userOptions(q, limit),
    queryFn: () => getWeeklyUserOptions(q, limit),
    ...NO_CACHE,
  })

export const useDefaultWeeklyGroup = () =>
  useQuery({ queryKey: weeklyReportKeys.group(), queryFn: getDefaultWeeklyGroup, ...NO_CACHE })

export const useSharedWeeklyOwners = () =>
  useQuery({
    queryKey: weeklyReportKeys.sharedOwners(),
    queryFn: getSharedWeeklyOwners,
    ...NO_CACHE,
  })

export function useSaveWeeklyPlan(ownerUserId: number, weekStart: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: WeeklyPlanSaveRequest) => saveWeeklyPlan(weekStart, body),
    onSuccess: data => {
      client.setQueryData(weeklyReportKeys.detail(ownerUserId, weekStart), data)
    },
  })
}

export function useSaveDefaultWeeklyGroup() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: saveDefaultWeeklyGroup,
    onSuccess: data => client.setQueryData(weeklyReportKeys.group(), data),
  })
}

export const useWeeklyProjectAnalytics = (
  projectId: number | null,
  from: string,
  to: string,
  /** 预览他人周报时传入，统计口径切到该所有者；看自己的周报时传 undefined */
  owner?: { userId: number; weekStartDate: string },
) =>
  useQuery({
    queryKey: weeklyReportKeys.analytics(projectId, from, to, owner),
    queryFn: () => getWeeklyProjectAnalytics(projectId!, from, to, owner),
    enabled: projectId !== null,
    ...NO_CACHE,
  })
