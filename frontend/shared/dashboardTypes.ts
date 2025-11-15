export interface DashboardStats {
  totalSubmissions: number;
  validMedicines: number;
  expiredMedicines: number;
  totalPoints: number;
  vouchersUsed: number;
  unreadNotifications: number;
}

export interface ActivityFeedItem {
  id: string;
  type: "submission" | "voucher" | "notification" | "feedback" | "points";
  title: string;
  description: string;
  status?: "pending" | "completed" | "rewarded";
  timestamp: string;
  metadata?: {
    points?: number;
    medicineId?: string;
    voucherId?: string;
  };
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  createdAt: string;
}

export interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
  count: number;
}

export interface ChartData {
  submissionsByDate: {
    date: string;
    count: number;
  }[];
  medicineTypes: {
    type: string;
    count: number;
  }[];
  pointsHistory: {
    date: string;
    points: number;
  }[];
  voucherUsage: {
    type: string;
    used: number;
    total: number;
  }[];
}

export interface MetricPoint {
  label: string;
  value: number;
}

export interface DistributionItem {
  label: string;
  value: number;
}

export interface UserDashboardStats {
  points: number;
  level: string;
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  returned: number;
  recalled: number;
  vouchersUsed: number;
  monthlyPoints: MetricPoint[];
}

export interface DashboardMetricsResponse {
  totalSubmissions: number;
  pendingSubmissions: number;
  processedSubmissions: number;
  totalUsers: number;
  totalVouchers: number;
  submissionTrend: MetricPoint[];
  voucherTrend: MetricPoint[];
  userRoleDistribution: DistributionItem[];
  medicineDistribution: DistributionItem[];
  userStats: UserDashboardStats | null | undefined;
}
