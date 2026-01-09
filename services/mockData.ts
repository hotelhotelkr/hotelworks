
import { Order, OrderStatus, Priority, Department, Role, User } from '../types';

export const USERS: User[] = [
  { id: 'u1', username: '1', password: '1', name: '프론트수', dept: Department.FRONT_DESK, role: Role.FD_STAFF },
  { id: 'u2', username: '2', password: '2', name: '하우스키핑수', dept: Department.HOUSEKEEPING, role: Role.HK_STAFF },
  { id: 'u4', username: 'admin', password: 'admin', name: 'Admin User', dept: Department.ADMIN, role: Role.ADMIN },
];

export const CURRENT_USER = USERS[0]; // Simulation as 프론트수

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}${month}${day}`;

export const INITIAL_ORDERS: Order[] = [
  {
    id: `${dateStr}_1`,
    roomNo: '1205',
    guestName: 'Mr. Smith',
    category: 'Amenities',
    itemName: 'Bottled Water',
    quantity: 4,
    priority: Priority.URGENT,
    status: OrderStatus.REQUESTED,
    requestedAt: new Date(now.getTime() - 1000 * 60 * 8), // 8 mins ago
    createdBy: 'u1',
    requestChannel: 'Phone',
    memos: [
      {
        id: 'memo-1',
        text: 'Guest requested cold water if possible.',
        senderId: 'u1',
        senderName: '프론트수',
        senderDept: Department.FRONT_DESK,
        timestamp: new Date(now.getTime() - 1000 * 60 * 8)
      }
    ]
  },
  {
    id: `${dateStr}_2`,
    roomNo: '802',
    guestName: 'Ms. Lee',
    category: 'Amenities',
    itemName: 'Large Towel',
    quantity: 2,
    priority: Priority.NORMAL,
    status: OrderStatus.ACCEPTED,
    requestedAt: new Date(now.getTime() - 1000 * 60 * 25), // 25 mins ago
    acceptedAt: new Date(now.getTime() - 1000 * 60 * 20),
    createdBy: 'u1',
    assignedTo: 'u2',
    requestChannel: 'Lobby',
    memos: [
      {
        id: 'memo-2',
        text: 'Quick delivery requested.',
        senderId: 'u1',
        senderName: '프론트수',
        senderDept: Department.FRONT_DESK,
        timestamp: new Date(now.getTime() - 1000 * 60 * 25)
      }
    ]
  },
  {
    id: `${dateStr}_3`,
    roomNo: '1511',
    guestName: 'H. Potter',
    category: 'Delivery',
    itemName: 'External Laundry',
    quantity: 1,
    priority: Priority.NORMAL,
    status: OrderStatus.COMPLETED,
    requestedAt: new Date(now.getTime() - 1000 * 60 * 120),
    acceptedAt: new Date(now.getTime() - 1000 * 60 * 110),
    completedAt: new Date(now.getTime() - 1000 * 60 * 90),
    createdBy: 'u1',
    assignedTo: 'u2',
    requestChannel: 'Phone',
    memos: [
      {
        id: 'memo-3',
        text: 'Guest laundry arrived at reception.',
        senderId: 'u1',
        senderName: '프론트수',
        senderDept: Department.FRONT_DESK,
        timestamp: new Date(now.getTime() - 1000 * 60 * 120)
      },
      {
        id: 'memo-4',
        text: 'Handed over to guest.',
        senderId: 'u2',
        senderName: '하우스키핑수',
        senderDept: Department.HOUSEKEEPING,
        timestamp: new Date(now.getTime() - 1000 * 60 * 95)
      }
    ]
  }
];
