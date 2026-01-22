import { 
  Droplets, 
  Wind, 
  Bed, 
  Smartphone, 
  Waves, 
  Smile, 
  Archive, 
  Shirt,
  Box
} from 'lucide-react';
import { OrderStatus, Priority } from './types';

export const STATUS_COLORS = {
  [OrderStatus.REQUESTED]: 'bg-amber-100 text-amber-800 border-amber-200',
  [OrderStatus.ACCEPTED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [OrderStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [OrderStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [OrderStatus.CANCELLED]: 'bg-slate-100 text-slate-500 border-slate-200',
};

export const PRIORITY_COLORS = {
  [Priority.NORMAL]: 'text-slate-500',
  [Priority.URGENT]: 'text-rose-600 font-bold animate-pulse',
};

export const CATEGORIES = [
  'Amenities',
  'Delivery',
  'Maintenance',
  'Cleaning',
  'Other'
];

export interface ItemDetail {
  name: string;
  icon: any;
  color: string;
  groupColor?: string; // 그룹별 카드 배경색
}

export const AMENITY_ITEMS_DETAILED: ItemDetail[] = [
  // 음료
  { name: '생수', icon: Droplets, color: 'text-blue-500 bg-blue-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  
  // 타월
  { name: '대형 타월(Bath Towel)', icon: Waves, color: 'text-cyan-500 bg-cyan-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '중형 타월(Face Towel)', icon: Waves, color: 'text-teal-500 bg-teal-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '발매트', icon: Waves, color: 'text-teal-400 bg-teal-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '샤워가운', icon: Shirt, color: 'text-cyan-400 bg-cyan-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  
  // 침구
  { name: '베개', icon: Archive, color: 'text-indigo-400 bg-indigo-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '침구세트', icon: Bed, color: 'text-purple-500 bg-purple-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  
  // 세면용품
  { name: '샴푸', icon: Droplets, color: 'text-blue-400 bg-blue-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '린스', icon: Droplets, color: 'text-blue-300 bg-blue-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '바디워시', icon: Droplets, color: 'text-blue-500 bg-blue-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '칫솔/치약', icon: Smile, color: 'text-emerald-500 bg-emerald-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '드라이기', icon: Wind, color: 'text-purple-400 bg-purple-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  
  // 기타
  { name: '슬리퍼', icon: Smile, color: 'text-amber-500 bg-amber-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '어댑터', icon: Smartphone, color: 'text-rose-400 bg-rose-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  { name: '런드리 봉투', icon: Shirt, color: 'text-slate-400 bg-slate-50', groupColor: 'bg-blue-50/30 border-blue-200' },
  
  // 식기류 (오더 빈도 낮음) - 다른 색으로 구분
  { name: '숟가락', icon: Archive, color: 'text-slate-500 bg-slate-50', groupColor: 'bg-orange-50/30 border-orange-200' },
  { name: '젓가락', icon: Box, color: 'text-orange-400 bg-orange-50', groupColor: 'bg-orange-50/30 border-orange-200' },
  { name: '포크', icon: Box, color: 'text-orange-500 bg-orange-50', groupColor: 'bg-orange-50/30 border-orange-200' },
  { name: '와인잔', icon: Droplets, color: 'text-rose-400 bg-rose-50', groupColor: 'bg-orange-50/30 border-orange-200' },
];

export const AMENITY_ITEMS = AMENITY_ITEMS_DETAILED.map(i => i.name);
