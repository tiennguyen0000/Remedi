export type NotificationPriority = "high" | "medium" | "low";
export type NotificationTarget = "user" | "admin" | "collaborator" | "system";
export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationType =
  | "medicine_submission"
  | "medicine_review"
  | "voucher_usage"
  | "feedback"
  | "comment"
  | "system_announcement"
  | "reminder"
  | "chatbot";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  target: NotificationTarget | string; // string for specific user ID
  status: NotificationStatus;
  link?: string;
  createdAt: string;
  readAt?: string;
  metadata?: {
    medicineId?: string;
    voucherId?: string;
    points?: number;
    submissionId?: string;
    feedbackId?: string;
    [key: string]: any;
  };
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  priority: NotificationPriority;
  defaultTarget: NotificationTarget;
  linkTemplate?: string;
}
