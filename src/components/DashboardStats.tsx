import React, { useMemo } from 'react';
import { ArrowUpRight, CalendarDays, Sparkles, Target, TrendingUp } from 'lucide-react';
import { OrderRecord } from '../types';
import { formatVND } from '../utils/textParser';

interface DashboardStatsProps {
  orders: OrderRecord[];
  onOpenStatistics: () => void;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

function isFinished(order: OrderRecord): boolean {
  return order.status === 'completed' || order.status === 'paid';
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ orders, onOpenStatistics }) => {
  const dashboard = useMemo(() => {
    const today = new Date();
    const todayKey = dateKey(today);
    const weekStart = dateKey(startOfWeek(today));
    const monthStart = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    const completed = orders.filter(isFinished);
    const aggregate = (from: string, to: string) => {
      const matching = completed.filter((order) => order.date >= from && order.date <= to);
      return {
        count: matching.length,
        revenue: matching.reduce((sum, order) => sum + (Number(order.finalAmount) || 0), 0),
      };
    };

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
      const key = dateKey(date);
      const result = aggregate(key, key);
      return { key, label: `T${date.getDay() === 0 ? 7 : date.getDay() + 1}`, ...result };
    });

    return {
      today: aggregate(todayKey, todayKey),
      week: aggregate(weekStart, todayKey),
      month: aggregate(monthStart, todayKey),
      days,
      peak: Math.max(...days.map((day) => day.revenue), 1),
    };
  }, [orders]);

  const message = dashboard.today.count > 0
    ? `Hôm nay bạn đã hoàn thành ${dashboard.today.count} đơn — tiếp tục thật tốt!`
    : 'Sổ mới sẵn sàng — bắt đầu bằng đơn đầu tiên của hôm nay.';

  const cards = [
    { label: 'Hôm nay', value: dashboard.today, icon: CalendarDays, color: 'blue' },
    { label: 'Tuần này', value: dashboard.week, icon: TrendingUp, color: 'violet' },
    { label: 'Tháng này', value: dashboard.month, icon: Target, color: 'emerald' },
  ];

  return (
    <section aria-labelledby="dashboard-stats-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/60 to-emerald-50/50 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><Sparkles className="h-4 w-4" /></span>
          <div>
            <h2 id="dashboard-stats-title" className="text-sm font-extrabold text-slate-900">Nhịp làm việc hôm nay</h2>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        </div>
        <button type="button" onClick={onOpenStatistics} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50">
          Báo cáo chi tiết <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-12 sm:p-4">
        <div className="grid grid-cols-3 gap-2 sm:col-span-7 sm:gap-3">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</span>
                <Icon className={`h-4 w-4 ${color === 'emerald' ? 'text-emerald-600' : color === 'violet' ? 'text-violet-600' : 'text-blue-600'}`} />
              </div>
              <p className="mt-2 truncate text-sm font-extrabold tracking-tight text-slate-900 sm:text-base" title={formatVND(value.revenue)}>{formatVND(value.revenue)}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">{value.count} đơn hoàn thành</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:col-span-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-slate-700">7 ngày gần đây</p>
            <span className="text-[10px] font-semibold text-slate-400">Doanh thu hoàn thành</span>
          </div>
          <div className="mt-3 flex h-16 items-end justify-between gap-1.5" aria-label="Biểu đồ doanh thu 7 ngày gần đây">
            {dashboard.days.map((day) => {
              const height = day.revenue > 0 ? Math.max(15, Math.round((day.revenue / dashboard.peak) * 100)) : 8;
              return (
                <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="sr-only">{day.label}: {formatVND(day.revenue)}</span>
                  <div title={`${day.label}: ${formatVND(day.revenue)}`} style={{ height: `${height}%` }} className="w-full max-w-5 rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-400 transition-all" />
                  <span className="text-[9px] font-bold text-slate-400">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
