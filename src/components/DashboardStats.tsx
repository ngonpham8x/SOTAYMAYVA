import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  ScanLine,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { OrderRecord } from '../types';
import { formatVND } from '../utils/textParser';

interface DashboardStatsProps {
  orders: OrderRecord[];
  onCreateOrder: () => void;
  onOpenHistory: () => void;
  onOpenStatistics: () => void;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFinished(order: OrderRecord): boolean {
  return order.status === 'completed' || order.status === 'paid';
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  orders,
  onCreateOrder,
  onOpenHistory,
  onOpenStatistics,
}) => {
  const dashboard = useMemo(() => {
    const today = localDateKey(new Date());
    const todayOrders = orders.filter((order) => order.date === today);
    const completedOrders = todayOrders.filter(isFinished);
    const pendingOrders = todayOrders.filter((order) => !isFinished(order));
    const revenue = completedOrders.reduce((sum, order) => sum + (Number(order.finalAmount) || 0), 0);
    const totalItems = todayOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    const latestOrder = [...orders].sort((a, b) => b.createdAt - a.createdAt)[0];
    return { completed: completedOrders.length, pending: pendingOrders.length, revenue, totalItems, latestOrder };
  }, [orders]);

  const dateLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(new Date());
  const todayCards = [
    { label: 'Doanh thu hôm nay', value: formatVND(dashboard.revenue), icon: WalletCards, tone: 'text-emerald-600 bg-emerald-50', note: `${dashboard.completed} đơn hoàn thành` },
    { label: 'Đơn đã xong', value: `${dashboard.completed} đơn`, icon: CheckCircle2, tone: 'text-blue-600 bg-blue-50', note: 'Sẵn sàng giao khách' },
    { label: 'Đang thực hiện', value: `${dashboard.pending} đơn`, icon: Clock3, tone: 'text-amber-600 bg-amber-50', note: `${dashboard.totalItems} món / công đoạn` },
  ];

  const quickActions = [
    { label: 'Quét hoặc nhập', icon: ScanLine, onClick: onCreateOrder, tone: 'border-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-50' },
    { label: 'Kiểm tra đơn', icon: CheckCircle2, onClick: onOpenHistory, tone: 'border-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50' },
    { label: 'Hoàn tất', icon: WalletCards, onClick: onOpenStatistics, tone: 'border-violet-100 text-violet-700 hover:border-violet-300 hover:bg-violet-50' },
  ];
  return (
    <section aria-labelledby="focus-dashboard-title" className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#083b88] via-[#0874b8] to-[#0aa99c] px-4 py-4 text-white shadow-lg shadow-blue-900/15 sm:px-5">
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="absolute -bottom-16 right-28 h-32 w-32 rounded-full bg-emerald-200/15 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-amber-200 shadow-sm"><Sparkles className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-cyan-100">{dateLabel}</p>
              <h2 id="focus-dashboard-title" className="mt-0.5 text-base font-black tracking-tight sm:text-lg">Hôm nay làm thật tốt.</h2>
              <p className="mt-0.5 text-xs font-medium text-blue-50/90">Mỗi đơn rõ ràng, mỗi khoản thu an tâm.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenStatistics} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 text-xs font-extrabold text-white backdrop-blur transition hover:bg-white/25">
            <BarChart3 className="h-4 w-4" /> Báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {todayCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" onClick={onOpenStatistics} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{card.label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}><Icon className="h-4 w-4" /></span></div>
              <p className="mt-3 truncate text-xl font-black tracking-tight text-slate-900">{card.value}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500"><ArrowRight className="h-3 w-3 text-cyan-600 transition group-hover:translate-x-0.5" />{card.note}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-emerald-50 p-4 lg:col-span-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ScanLine className="h-4 w-4 text-cyan-600" /> Nhịp làm việc gọn gàng</p>
          <p className="mt-1 text-xs font-medium text-slate-600">Chọn nhanh một thao tác để bắt đầu công việc.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" onClick={action.onClick} className={`group rounded-xl border bg-white px-2 py-3 text-center text-[10px] font-extrabold transition sm:text-xs ${action.tone}`}>
                  <Icon className="mx-auto mb-1 h-4 w-4 transition group-hover:-translate-y-0.5" />
                  <span className="block truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={onOpenHistory} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-cyan-200 hover:shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-400">Đơn gần nhất</p><p className="mt-1 truncate text-sm font-extrabold text-slate-900">{dashboard.latestOrder?.title || 'Chưa có đơn nào'}</p><p className="mt-1 text-xs text-slate-500">{dashboard.latestOrder ? `${dashboard.latestOrder.items.length} món · ${formatVND(dashboard.latestOrder.finalAmount)}` : 'Bắt đầu một đơn mới để tạo nhịp làm việc.'}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-cyan-600" /></div>
        </button>
      </div>
    </section>
  );
};