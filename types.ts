
export enum OrderStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT'
}

export enum Department {
  FRONT_DESK = 'FRONT_DESK',
  HOUSEKEEPING = 'HOUSEKEEPING',
  ADMIN = 'ADMIN'
}

export enum Role {
  FD_STAFF = 'FD_STAFF',
  HK_STAFF = 'HK_STAFF',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  dept: Department;
  role: Role;
}

export interface Memo {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderDept: Department;
  timestamp: Date;
}

export interface Order {
  id: string;
  roomNo: string;
  guestName?: string;
  category: string;
  itemName: string;
  quantity: number;
  priority: Priority;
  status: OrderStatus;
  requestedAt: Date;
  acceptedAt?: Date;
  inProgressAt?: Date;
  completedAt?: Date;
  createdBy: string; // User ID
  assignedTo?: string; // User ID
  requestChannel: string;
  memos: Memo[];
  // Added requestNote to the interface to support creation payloads using Partial<Order>
  // and resolve TypeScript errors in App.tsx and components/RapidOrder.tsx
  requestNote?: string;
}

export interface FilterOptions {
  status: OrderStatus | 'ALL';
  priority: Priority | 'ALL';
  roomNo: string;
  dateRange: 'TODAY' | 'WEEK' | 'CUSTOM';
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'memo';
  dept?: Department;
  timestamp: Date;
}
