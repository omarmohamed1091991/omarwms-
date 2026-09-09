interface DashboardStatsProps {
  individualMessages: number
  bulkCampaigns: number
  unreadMessages: number
  isActive: boolean
  isAdmin?: boolean
}

export function DashboardStats({
  individualMessages,
  bulkCampaigns,
  unreadMessages,
  isActive,
  isAdmin,
}: DashboardStatsProps) {
  // This component is deprecated - stats are now shown directly in dashboard page
  return null
}
