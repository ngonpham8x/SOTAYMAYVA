import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
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
    const revenue = completedOrders.reduce(
      (sum, order) => sum + (Number(order.finalAmount) || 0),
      0,
    );
    const totalItems = todayOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const latestOrder = [...orders].sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      completed: completedOrders.length,
      pending: pendingOrders.length,
      revenue,
      totalItems,
      latestOrder,
    };
  }, [orders]);

  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date());

  const message = dashboard.completed > 0
    ? `Bạn đã hoàn thành ${dashboard.completed} đơn hôm nay. Giữ nhịp thật tốt nhé!`
    : 'Bắt đầu một ngày thật gọn gàng — từng đơn một, thật chỉn chu.';

  return (
    <section aria-labelledby="focus-dashboard-title" className="space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-blue-600/30 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100">
              <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
            </span>
            <h2 id="focus-dashboard-title" className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Hôm nay mình làm thật tốt.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              id="btn-create-order"
              type="button"
              onClick={onCreateOrder}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-cyan-50 active:translate-y-0"
            >
              <Plus className="h-5 w-5 text-blue-600" strokeWidth={2.5} /> Tạo phiếu mới
            </button>
            <button
              type="button"
              onClick={onOpenStatistics}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <BarChart3 className="h-4 w-4" /> Báo cáo
            </button>
          </div>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs grid-cols-3 divide-x divide-slate-100">
        <div className="min-w-0 px-3 py-4 text-center sm:px-5 sm:text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><WalletCards className="h-4 w-4" /></span>
          <p className="mt-2 truncate text-base font-black tracking-tight text-slate-900 sm:text-lg" title={formatVND(dashboard.revenue)}>{formatVND(dashboard.revenue)}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Doanh thu hôm nay</p>
        </div>
        <div className="min-w-0 px-3 py-4 text-center sm:px-5 sm:text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CheckCircle2 className="h-4 w-4" /></span>
          <p className="mt-2 text-base font-black tracking-tight text-slate-900 sm:text-lg">{dashboard.completed} <span className="text-xs font-bold text-slate-400">đơn</span></p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Đã xong</p>
        </div>
        <div className="min-w-0 px-3 py-4 text-center sm:px-5 sm:text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Clock3 className="h-4 w-4" /></span>
          <p className="mt-2 text-base font-black tracking-tight text-slate-900 sm:text-lg">{dashboard.pending} <span className="text-xs font-bold text-slate-400">đơn</span></p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-[11px]">Đang làm</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Sparkles className="h-4 w-4 text-blue-600" /> Nhịp làm việc gọn gàng</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-600">
            <span className="rounded-xl bg-white px-2 py-2.5 shadow-xs"><ScanLine className="mx-auto mb-1 h-4 w-4 text-blue-600" />Quét hoặc nhập</span>
            <span className="rounded-xl bg-white px-2 py-2.5 shadow-xs"><CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-600" />Kiểm tra đơn</span>
            <span className="rounded-xl bg-white px-2 py-2.5 shadow-xs"><WalletCards className="mx-auto mb-1 h-4 w-4 text-violet-600" />Hoàn tất</span>
          </div>
        </div>

        <button type="button" onClick={onOpenHistory} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-200 hover:shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">Đơn gần nhất</p>
              <p className="mt-1 truncate text-sm font-extrabold text-slate-900">{dashboard.latestOrder?.title || 'Chưa có đơn nào'}</p>
              <p className="mt-1 text-xs text-slate-500">{dashboard.latestOrder ? `${dashboard.latestOrder.items.length} món · ${formatVND(dashboard.latestOrder.finalAmount)}` : `Hôm nay đã có ${dashboard.totalItems} món / công đoạn`}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </div>
        </button>
      </div>
    </section>
  );
};