export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  count: number;
  severity: 'info' | 'warn' | 'danger' | string;
  route: string;
}

export interface NotificationsInbox {
  total: number;
  items: AppNotificationItem[];
  generatedAt?: string;
}
