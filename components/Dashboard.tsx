
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Zap,
  TrendingUp,
  FileDown,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Activity,
  Users,
  BarChart3
} from 'lucide-react';
import { Order, OrderStatus, Priority, User, Department } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import OrderList from './OrderList';
import RapidOrder from './RapidOrder';
import MemoFeed from './MemoFeed';

interface DashboardProps {
  orders: Order[];
  onExport: () => void;
  currentUser: User;
  onUpdateStatus: (id: string, status: OrderStatus, note?: string) => void;
  onOpenMemo: (order: Order) => void;
  onDispatch?: (data: Partial<Order>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ orders, onExport, currentUser, onUpdateStatus, onOpenMemo, onDispatch }) => {
  const navigate = useNavigate();
  const [dashboardFilters, setDashboardFilters] = useState({
    status: 'ALL' as OrderStatus | 'ALL',
    priority: 'ALL' as Priority | 'ALL',
    roomNo: '',
    dateRange: 'TODAY' as any
  });

  const activeOrders = orders.filter(o => o.status !== OrderStatus.CANCELLED);

  const stats = {
    pending: activeOrders.filter(o => o.status === OrderStatus.REQUESTED).length,
    inProgress: activeOrders.filter(o => o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.IN_PROGRESS).length,
    completedToday: activeOrders.filter(o => o.status === OrderStatus.COMPLETED).length,
    urgent: activeOrders.filter(o => o.priority === Priority.URGENT && o.status !== OrderStatus.COMPLETED).length,
    cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length
  };

  const chartData = [
    { name: 'Requested', value: stats.pending, color: '#f59e0b' },
    { name: 'Active', value: stats.inProgress, color: '#4f46e5' },
    { name: 'Done', value: stats.completedToday, color: '#10b981' },
  ];

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }, [orders]);

  // 24시간 시간대별 주문 통계 계산 (실시간 업데이트)
  const hourlyStats24h = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const stats = hours.map(hour => {
      // 오늘 날짜의 해당 시간대 주문 필터링
      const ordersInHour = orders.filter(o => {
        const orderDate = new Date(o.requestedAt);
        const orderHour = orderDate.getHours();
        const orderDay = new Date(orderDate);
        orderDay.setHours(0, 0, 0, 0);
        
        // 오늘 날짜이고 해당 시간대인 주문만 포함
        // 예: 23시 주문은 23시에, 00시 주문은 00시에 표시
        return orderDay.getTime() === today.getTime() && orderHour === hour;
      });
      
      return {
        hour: hour,
        hourLabel: hour.toString().padStart(2, '0'),
        count: ordersInHour.length,
        completed: ordersInHour.filter(o => o.status === OrderStatus.COMPLETED).length,
        pending: ordersInHour.filter(o => o.status === OrderStatus.REQUESTED).length,
        inProgress: ordersInHour.filter(o => o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.IN_PROGRESS).length
      };
    });
    
    return stats;
  }, [orders]);

  const isHousekeeping = currentUser.dept === Department.HOUSEKEEPING;
  const isFrontDesk = currentUser.dept === Department.FRONT_DESK;
  const isAdmin = currentUser.dept === Department.ADMIN;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* 1. Main Operation Area (FRONT DESK / HOUSE KEEPING) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-tight">
                {isHousekeeping ? 'HOUSE KEEPING' : 'FRONT DESK'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Real-time Operational Interface
              </p>
            </div>
          </div>
          <button 
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-3 sm:py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95 sm:w-auto w-full min-h-[44px] sm:min-h-0"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export Data</span>
            <span className="sm:hidden">엑셀 내보내기</span>
          </button>
        </div>

        {/* [1st] Rapid Dispatch - ONLY FOR FD/ADMIN */}
        {(isFrontDesk || isAdmin) && onDispatch && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-2 shadow-xl shadow-slate-200/50">
             <RapidOrder onDispatch={onDispatch} />
          </div>
        )}

        {/* [1.5] 실시간 메모 피드 - 모든 사용자 */}
        <MemoFeed orders={orders} maxItems={5} />

        {/* [2nd] Recent Dispatch Activity - ONLY FOR FD/ADMIN */}
        {(!isHousekeeping) && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-8 shadow-sm overflow-hidden w-full max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Recent Activity (Latest 50)
              </h3>
              <button 
                onClick={() => navigate('/orders')}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest flex items-center gap-1 self-start sm:self-auto"
              >
                View Full History <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="w-full max-w-full overflow-x-hidden">
              <OrderList 
                orders={sortedOrders.slice(0, 50)} 
                filters={dashboardFilters} 
                setFilters={setDashboardFilters} 
                onUpdateStatus={onUpdateStatus}
                onExport={onExport}
                currentUser={currentUser}
                onOpenMemo={onOpenMemo}
              />
            </div>
          </div>
        )}

        {/* Main Task List for Housekeeping Staff */}
        {isHousekeeping && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-4 sm:p-6 shadow-xl shadow-slate-200/50 w-full max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
               <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                 <ClipboardList className="w-5 h-5 text-indigo-600" />
                 활성 작업 (최근 50개)
               </h3>
               <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-black uppercase whitespace-nowrap">
                  {stats.pending + stats.inProgress}개 남음
                </span>
                <button 
                  onClick={() => navigate('/orders')}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                  히스토리 <ArrowRight className="w-3 h-3" />
                </button>
               </div>
            </div>
            <div className="w-full max-w-full overflow-x-hidden">
              <OrderList 
                orders={sortedOrders.slice(0, 50)} 
                filters={dashboardFilters} 
                setFilters={setDashboardFilters} 
                onUpdateStatus={onUpdateStatus}
                onExport={onExport}
                currentUser={currentUser}
                onOpenMemo={onOpenMemo}
              />
            </div>
          </div>
        )}
      </section>

      {/* 2. KPI Overview Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Pending', val: stats.pending, icon: Clock, color: 'amber', sub: 'Waiting' },
          { label: 'Active', val: stats.inProgress, icon: TrendingUp, color: 'indigo', sub: 'In Transit' },
          { label: 'Urgent', val: stats.urgent, icon: AlertCircle, color: 'rose', sub: 'Critical' },
          { label: 'Resolved', val: stats.completedToday, icon: CheckCircle, color: 'emerald', sub: 'Success' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{item.label}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter">{item.val}</p>
              </div>
              <div className={`p-1.5 sm:p-2 bg-${item.color}-50 rounded-xl sm:rounded-2xl shrink-0 ml-2`}>
                <item.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-${item.color}-600`} />
              </div>
            </div>
            <p className={`mt-2 sm:mt-3 text-[8px] sm:text-[9px] font-bold text-${item.color}-600 uppercase tracking-widest sm:opacity-0 group-hover:opacity-100 transition-opacity`}>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* 3. Analytics & Navigation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs sm:text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
              Operational Flow
            </h3>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>
          <div className="h-32 sm:h-36 lg:h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs sm:text-sm mb-4 sm:mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            시간대별 통계
          </h3>
          
          {/* 24시간 시간대별 통계 - 주식 차트 스타일 */}
          <div className="flex-1 min-h-0 flex flex-col">
            {(() => {
              const currentHour = new Date().getHours();
              const totalOrders = hourlyStats24h.reduce((sum, s) => sum + s.count, 0);
              
              // 그래프 데이터 준비 (이전 시간대와 비교)
              const chartData = hourlyStats24h.map((stat, index) => {
                const prevCount = index > 0 ? hourlyStats24h[index - 1].count : stat.count;
                const change = stat.count - prevCount;
                const changePercent = prevCount > 0 ? ((change / prevCount) * 100).toFixed(1) : '0.0';
                
                return {
                  hour: stat.hour,
                  hourLabel: stat.hourLabel,
                  오더수: stat.count,
                  이전: prevCount,
                  변화: change,
                  변화율: changePercent,
                  완료: stat.completed,
                  진행: stat.inProgress,
                  대기: stat.pending,
                  isCurrent: stat.hour === currentHour,
                  isUp: change >= 0
                };
              });

              // 통계 계산
              const maxCount = hourlyStats24h.length > 0 ? Math.max(...hourlyStats24h.map(s => s.count), 0) : 0;
              const avgCount = totalOrders > 0 ? (totalOrders / 24).toFixed(1) : '0';
              const peakHour = hourlyStats24h.length > 0 
                ? hourlyStats24h.reduce((max, stat) => 
                    stat.count > max.count ? stat : max, hourlyStats24h[0]
                  )
                : { hour: 0, hourLabel: '00', count: 0 };
              const completedTotal = hourlyStats24h.reduce((sum, s) => sum + s.completed, 0);
              const inProgressTotal = hourlyStats24h.reduce((sum, s) => sum + s.inProgress, 0);
              const pendingTotal = hourlyStats24h.reduce((sum, s) => sum + s.pending, 0);
              
              // 23시~00시 주문 확인
              const hour23Orders = hourlyStats24h.find(s => s.hour === 23)?.count || 0;
              const hour00Orders = hourlyStats24h.find(s => s.hour === 0)?.count || 0;

              return (
                <div className="flex-1 flex flex-col space-y-2 min-h-0 bg-slate-900 rounded-xl p-2 sm:p-3">
                  {/* 헤더 - 주식 차트 스타일 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2">
                <div>
                      <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                        {totalOrders}
                      </div>
                      <div className="text-[10px] sm:text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                        오늘 총 오더
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="text-[9px] sm:text-[10px] lg:text-xs text-slate-400 leading-tight">
                          완료: <span className="text-emerald-400 font-bold text-xs sm:text-sm">{completedTotal}</span> | 
                          진행: <span className="text-blue-400 font-bold text-xs sm:text-sm">{inProgressTotal}</span> | 
                          대기: <span className="text-amber-400 font-bold text-xs sm:text-sm">{pendingTotal}</span>
                        </div>
                        <div className="text-[9px] sm:text-[10px] lg:text-xs text-slate-400 leading-tight">
                          평균: <span className="text-slate-200 font-bold text-xs sm:text-sm">{avgCount}</span>오더/시간 | 
                          최대: <span className="text-slate-200 font-bold text-xs sm:text-sm">{maxCount}</span>오더 ({peakHour.hourLabel}:00)
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm lg:text-base font-bold text-slate-400 uppercase mb-2 sm:mb-3">
                        24H 통계
                      </div>
                      <div className="text-[10px] sm:text-xs lg:text-sm text-slate-400 space-y-1 sm:space-y-1.5">
                        <div className="text-xs sm:text-sm lg:text-base">
                          현재 시간: <span className="text-white font-bold text-sm sm:text-base lg:text-lg">{currentHour.toString().padStart(2, '0')}:00</span>
                        </div>
                        <div className="text-xs sm:text-sm lg:text-base">
                          활성 오더: <span className="text-indigo-400 font-bold text-sm sm:text-base lg:text-lg">{inProgressTotal + pendingTotal}</span>
                        </div>
                        <div className="text-[9px] sm:text-xs lg:text-sm text-slate-300 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-700 text-right">
                          23시: <span className="text-slate-100 font-bold text-xs sm:text-sm lg:text-base">{hour23Orders}</span>건
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 주식 차트 */}
                  <div className="flex-1 min-h-[180px] sm:min-h-[200px] lg:min-h-[250px] bg-slate-800 rounded-lg p-1 sm:p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
                        <defs>
                          <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis 
                          dataKey="hourLabel" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9ca3af', fontSize: 6, fontWeight: 600}}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9ca3af', fontSize: 7, fontWeight: 600}}
                          width={30}
                          ticks={(() => {
                            const max = Math.max(...chartData.map(d => d.오더수), 0);
                            const step = max > 50 ? 10 : max > 20 ? 5 : max > 10 ? 2 : 1;
                            const ticks = [];
                            for (let i = 0; i <= max + step; i += step) {
                              ticks.push(i);
                            }
                            return ticks;
                          })()}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff',
                            padding: '10px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)'
                          }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}
                          formatter={(value: number, name: string, props: any) => {
                            const data = props.payload;
                            if (name === '오더수') {
                              return [
                                <div key="tooltip" className="space-y-1">
                                  <div className="font-black text-sm text-white">{data.hourLabel}:00</div>
                                  <div className="text-xs font-bold text-emerald-400">
                                    총 {value}건
                                  </div>
                                  {data.변화 !== 0 && (
                                    <div className={`text-[10px] font-bold ${data.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {data.isUp ? '↑' : '↓'} {Math.abs(data.변화)} ({data.변화율}%)
                                    </div>
                                  )}
                                  {data.완료 > 0 && (
                                    <div className="text-[9px] text-emerald-300 font-bold">
                                      완료: {data.완료}건
                                    </div>
                                  )}
                                  {data.진행 > 0 && (
                                    <div className="text-[9px] text-blue-300 font-bold">
                                      진행: {data.진행}건
                                    </div>
                                  )}
                                  {data.대기 > 0 && (
                                    <div className="text-[9px] text-amber-300 font-bold">
                                      대기: {data.대기}건
                                    </div>
                                  )}
                                </div>
                              ];
                            }
                            return value;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="오더수" 
                          stroke="#10b981" 
                          strokeWidth={2.5}
                          fill="url(#stockGradient)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 하단 정보 - 주식 차트 스타일 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[9px] sm:text-[10px] text-slate-400 pt-2 border-t border-slate-700 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="font-bold">오더 수</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {chartData.length > 1 && (() => {
                        const first = chartData[0].오더수;
                        const last = chartData[chartData.length - 1].오더수;
                        const totalChange = last - first;
                        const totalChangePercent = first > 0 ? ((totalChange / first) * 100).toFixed(1) : '0.0';
                        return (
                          <div className={`font-black text-xs sm:text-sm ${totalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalChange >= 0 ? '↑' : '↓'} {Math.abs(totalChange)} ({totalChangePercent}%)
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* 전체 주문 보기 버튼 */}
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-black text-indigo-700 uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            전체 주문 보기
          </button>
          
          {/* 연결 상태 */}
          <div className="mt-4 p-3 bg-indigo-600 rounded-xl text-center shadow-lg shadow-indigo-200">
             <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mb-1 leading-none">Status</p>
             <p className="text-xs font-bold text-white uppercase italic tracking-tighter">Live Connection</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
