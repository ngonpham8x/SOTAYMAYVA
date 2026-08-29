import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Scissors,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Phone,
  Sparkles,
  ArrowUpRight,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { OrderRecord, ShopSettings, StatsTimeframe } from '../types';
import { formatVND } from '../utils/textParser';
import { exportStatisticsToExcel } from '../utils/excelExporter';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Render the same report directly on the home page instead of in a dialog. */
  embedded?: boolean;
  orders: OrderRecord[];
  shopSettings: ShopSettings;
  onToggleOrderStatus?: (id: string, newStatus: 'pending' | 'completed' | 'paid') => void;
  onEditOrder?: (order: OrderRecord) => void;
  onDeleteOrder?: (id: string) => void;
}

/**
 * Helper to safely parse YYYY-MM-DD into local Date without UTC offset issues
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
}

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  embedded = false,
  orders,
  shopSettings,
  onToggleOrderStatus,
  onEditOrder,
  onDeleteOrder,
}) => {
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('day');
  const [referenceDate, setReferenceDate] = useState<string>(() =>
    formatDateString(new Date())
  );
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed_only' | 'pending_only'>('all');
  const [activeMetric, setActiveMetric] = useState<{ label: string; detail: string } | null>(null);

  // Extract unique workers
  const workers = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.workerName).filter(Boolean)));
  }, [orders]);

  // Compute start and end dates based on timeframe & reference date
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const ref = parseLocalDate(referenceDate);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const d = ref.getDate();

    let start = new Date(y, m, d);
    let end = new Date(y, m, d);
    let label = '';

    if (timeframe === 'day') {
      label = `Ngày ${ref.toLocaleDateString('vi-VN')}`;
      start = new Date(y, m, d);
      end = new Date(y, m, d);
    } else if (timeframe === 'week') {
      const dayOfWeek = ref.getDay(); // 0: Sun, 1: Mon
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(y, m, d + diffToMonday);
      end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      label = `Tuần (${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')})`;
    } else if (timeframe === 'month') {
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
      label = `Tháng ${m + 1}/${y}`;
    } else if (timeframe === 'year') {
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      label = `Năm ${y}`;
    } else {
      label = 'Toàn bộ thời gian';
      start = new Date(2000, 0, 1);
      end = new Date(2100, 11, 31);
    }

    const startStr = formatDateString(start);
    const endStr = formatDateString(end);

    return { startDate: startStr, endDate: endStr, periodLabel: label };
  }, [timeframe, referenceDate]);

  // Filter orders matching timeframe, worker, category, and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.date;
      const withinDate =
        timeframe === 'all' ||
        (orderDate >= startDate && orderDate <= endDate);

      const matchesWorker =
        selectedWorker === 'all' || order.workerName === selectedWorker;

      const isAlteration =
        order.category === 'alteration' ||
        /(sửa|cắt gấu|lên lai|bóp eo|thay khoá|thay dây kéo|mạng|đơm nút|hạ nách|nới|vá)/i.test(
          `${order.title} ${order.rawText || ''}`
        );

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'alteration' && isAlteration) ||
        (selectedCategory === 'sewing' && !isAlteration);

      const isCompleted = order.status === 'completed' || order.status === 'paid';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed_only' && isCompleted) ||
        (statusFilter === 'pending_only' && !isCompleted);

      return withinDate && matchesWorker && matchesCategory && matchesStatus;
    });
  }, [orders, timeframe, startDate, endDate, selectedWorker, selectedCategory, statusFilter]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalAdvances = 0;
    let totalDiscounts = 0;
    let totalGarments = 0;
    let completedOrders = 0;
    let pendingOrders = 0;

    const workerMap: Record<
      string,
      { count: number; total: number; garments: number }
    > = {};

    const categoryMap: Record<string, { count: number; total: number }> = {
      alteration: { count: 0, total: 0 },
      sewing: { count: 0, total: 0 },
      rental: { count: 0, total: 0 },
      general: { count: 0, total: 0 },
    };

    const dayMap: Record<string, { count: number; total: number }> = {};

    filteredOrders.forEach((order) => {
      const isCompleted = order.status === 'completed' || order.status === 'paid';
      if (isCompleted) {
        completedOrders++;
      } else {
        pendingOrders++;
      }

      totalRevenue += order.finalAmount;
      totalSubtotal += order.subtotal || order.finalAmount;
      totalAdvances += order.advanceAmount || 0;
      totalDiscounts += order.discountAmount || 0;

      const garmentsInOrder =
        order.items?.reduce(
          (sum, it) =>
            sum + (it.type !== 'advance' && it.type !== 'discount' ? it.quantity : 0),
          0
        ) || 0;
      totalGarments += garmentsInOrder;

      // Category breakdown
      const catKey = order.category || 'alteration';
      if (!categoryMap[catKey]) {
        categoryMap[catKey] = { count: 0, total: 0 };
      }
      categoryMap[catKey].count += 1;
      categoryMap[catKey].total += order.finalAmount;

      // Worker breakdown
      const wName = order.workerName || 'Chưa gán thợ';
      if (!workerMap[wName]) {
        workerMap[wName] = { count: 0, total: 0, garments: 0 };
      }
      workerMap[wName].count += 1;
      workerMap[wName].total += order.finalAmount;
      workerMap[wName].garments += garmentsInOrder;

      // Day breakdown
      if (!dayMap[order.date]) {
        dayMap[order.date] = { count: 0, total: 0 };
      }
      dayMap[order.date].count += 1;
      dayMap[order.date].total += order.finalAmount;
    });

    const avgOrderValue =
      filteredOrders.length > 0
        ? Math.round(totalRevenue / filteredOrders.length)
        : 0;

    return {
      totalOrders: filteredOrders.length,
      completedOrders,
      pendingOrders,
      totalRevenue,
      totalSubtotal,
      totalAdvances,
      totalDiscounts,
      totalGarments,
      avgOrderValue,
      workerMap,
      categoryMap,
      dayMap,
    };
  }, [filteredOrders]);
  // Revenue cards always show completed revenue, independent of the report filters.
  const revenueSummary = useMemo(() => {
    const reference = new Date();
    const today = formatDateString(reference);
    const dayOfWeek = reference.getDay();
    const weekStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const completedOrders = orders.filter((order) => order.status === 'completed' || order.status === 'paid');
    const summarize = (from?: string, to?: string) => {
      const matching = completedOrders.filter((order) => !from || !to || (order.date >= from && order.date <= to));
      return {
        total: matching.reduce((sum, order) => sum + (Number(order.finalAmount) || 0), 0),
        count: matching.length,
      };
    };

    return {
      all: summarize(),
      day: summarize(today, today),
      week: summarize(formatDateString(weekStart), today),
      month: summarize(formatDateString(monthStart), today),
    };
  }, [orders]);

  const metricCards = [
    { id: 'all', label: 'Tổng doanh thu', value: revenueSummary.all.total, unit: 'VNĐ', detail: `Tất cả ${revenueSummary.all.count} đơn đã hoàn thành`, timeframe: 'all' as StatsTimeframe, icon: DollarSign, tone: 'emerald' },
    { id: 'day', label: 'Doanh thu hôm nay', value: revenueSummary.day.total, unit: 'VNĐ', detail: `${revenueSummary.day.count} đơn đã hoàn thành hôm nay`, timeframe: 'day' as StatsTimeframe, icon: Calendar, tone: 'blue' },
    { id: 'week', label: 'Doanh thu tuần này', value: revenueSummary.week.total, unit: 'VNĐ', detail: `${revenueSummary.week.count} đơn đã hoàn thành trong tuần`, timeframe: 'week' as StatsTimeframe, icon: TrendingUp, tone: 'violet' },
    { id: 'month', label: 'Doanh thu tháng này', value: revenueSummary.month.total, unit: 'VNĐ', detail: `${revenueSummary.month.count} đơn đã hoàn thành trong tháng`, timeframe: 'month' as StatsTimeframe, icon: Sparkles, tone: 'cyan' },
    { id: 'orders', label: 'Số đơn sửa / may', value: stats.totalOrders, unit: 'đơn', detail: `${stats.pendingOrders} đơn đang làm trong ${periodLabel.toLowerCase()}`, timeframe, icon: Scissors, tone: 'blue' },
    { id: 'items', label: 'Số món / công đoạn', value: stats.totalGarments, unit: 'món', detail: `Tổng số món đã ghi nhận trong ${periodLabel.toLowerCase()}`, timeframe, icon: Sparkles, tone: 'violet' },
    { id: 'average', label: 'TB mỗi đơn', value: stats.avgOrderValue, unit: 'VNĐ', detail: `Doanh số trung bình của ${stats.totalOrders} đơn trong ${periodLabel.toLowerCase()}`, timeframe, icon: TrendingUp, tone: 'amber' },
  ];

  const handleMetricClick = (metric: (typeof metricCards)[number]) => {
    setTimeframe(metric.timeframe);
    setReferenceDate(formatDateString(new Date()));
    setActiveMetric({ label: metric.label, detail: metric.detail });
    window.setTimeout(() => document.getElementById('statistics-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  };
  // Navigate Period (Previous / Next)
  const handleShiftPeriod = (direction: -1 | 1) => {
    const ref = parseLocalDate(referenceDate);
    if (timeframe === 'day') {
      ref.setDate(ref.getDate() + direction);
    } else if (timeframe === 'week') {
      ref.setDate(ref.getDate() + direction * 7);
    } else if (timeframe === 'month') {
      ref.setMonth(ref.getMonth() + direction);
    } else if (timeframe === 'year') {
      ref.setFullYear(ref.getFullYear() + direction);
    }
    setReferenceDate(formatDateString(ref));
  };

  const handleExportExcelXLSX = () => {
    exportStatisticsToExcel({
      timeframeLabel: periodLabel,
      stats,
      orders: filteredOrders,
      shopSettings,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!embedded && !isOpen) return null;

  return (
    <div
      id={embedded ? 'home-statistics' : undefined}
      className={embedded
        ? 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs'
        : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs'}
    >
      <div className={embedded
        ? 'w-full bg-white'
        : 'flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200'}>
        {/* Modal Top Header */}
        {!embedded && <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Báo Cáo Thống Kê Doanh Thu & Công Thợ
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-full text-xs font-bold">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Theo dõi chính xác doanh thu sửa đồ, may gia công và thu nhập từng thợ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>}

        {/* Filter Control Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'day'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Hôm Nay
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tuần Này
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tháng Này
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Năm Nay
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tất Cả
            </button>
          </div>

          {/* Date Navigator & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {timeframe !== 'all' && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleShiftPeriod(-1)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                  title="Kỳ trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="text-xs font-semibold px-2 py-1 text-slate-800 outline-hidden bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleShiftPeriod(1)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                  title="Kỳ sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed_only">✓ Chỉ đơn Đã hoàn thành</option>
              <option value="pending_only">⏳ Chỉ đơn Đang sửa / Chờ làm</option>
            </select>

            {/* Worker Filter */}
            {workers.length > 0 && (
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-hidden"
              >
                <option value="all">Tất cả thợ ({workers.length})</option>
                {workers.map((w) => (
                  <option key={w} value={w}>
                    Thợ: {w}
                  </option>
                ))}
              </select>
            )}

            {/* XLSX Export Button */}
            <button
              id="btn-export-stats-xlsx"
              type="button"
              onClick={handleExportExcelXLSX}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className={`p-4 sm:p-6 space-y-6 bg-slate-50/50 ${embedded ? '' : 'overflow-y-auto flex-1'}`}>
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              const tone = {
                emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                blue: 'bg-blue-50 text-blue-600 ring-blue-100',
                violet: 'bg-violet-50 text-violet-600 ring-violet-100',
                cyan: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
                amber: 'bg-amber-50 text-amber-600 ring-amber-100',
              }[metric.tone];

              return (
                <button
                  key={metric.id}
                  type="button"
                  onClick={() => handleMetricClick(metric)}
                  className="group relative min-h-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500 sm:text-xs">{metric.label}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}><Icon className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-4 truncate font-mono text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {metric.value.toLocaleString('vi-VN')} <span className="text-[10px] font-bold text-slate-400 sm:text-xs">{metric.unit}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="truncate">{metric.detail}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-blue-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </button>
              );
            })}
          </div>

          {activeMetric && (
            <section id="statistics-detail" className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-4 shadow-xs sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">Chi tiết đang xem</p>
                  <h3 className="mt-1 text-base font-black text-slate-900">{activeMetric.label}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-600">{activeMetric.detail}</p>
                </div>
                <button type="button" onClick={() => setActiveMetric(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Đóng chi tiết</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-white/90 px-3 py-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Đơn trong kỳ</p><p className="mt-1 text-base font-black text-slate-900">{stats.totalOrders}</p></div>
                <div className="rounded-xl bg-white/90 px-3 py-2.5"><p className="text-[10px] font-bold uppercase text-slate-400">Hoàn thành</p><p className="mt-1 text-base font-black text-emerald-700">{stats.completedOrders}</p></div>
                <button type="button" onClick={() => document.getElementById('statistics-order-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-xl bg-slate-900 px-3 py-2.5 text-left text-xs font-bold text-white transition hover:bg-blue-700">Xem danh sách đơn →</button>
              </div>
            </section>
          )}

          {/* Worker Revenue Breakdown */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Thống kê theo Thợ may & Người thực hiện ({Object.keys(stats.workerMap).length} thợ)</span>
            </h3>

            {Object.keys(stats.workerMap).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">Chưa có dữ liệu thợ trong kỳ này.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(stats.workerMap).map(([worker, data]: [string, { count: number; total: number; garments: number }]) => {
                  const percent =
                    stats.totalRevenue > 0
                      ? Math.round((data.total / stats.totalRevenue) * 100)
                      : 0;

                  return (
                    <div
                      key={worker}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {worker}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          {percent}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs mb-2">
                        <span className="text-slate-500">{data.count} đơn ({data.garments} món)</span>
                        <span className="font-extrabold text-blue-700 font-mono text-sm">
                          {formatVND(data.total)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Orders Detailed Table */}
          <div id="statistics-order-list" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Danh sách đơn hàng trong kỳ ({filteredOrders.length} đơn)</span>
              </h3>

              <span className="text-xs font-bold text-slate-600">
                Tổng cộng:{' '}
                <span className="font-mono text-emerald-700 font-extrabold text-sm">
                  {formatVND(stats.totalRevenue)}
                </span>
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Không có đơn nào trong kỳ {periodLabel}.</p>
              </div>
            ) : (
              <>
              <div className="space-y-3 p-3 md:hidden">
                {filteredOrders.map((ord) => {
                  const isCompleted = ord.status === 'completed' || ord.status === 'paid';
                  const cleanPhone = (ord.customerPhone || '').replace(/[^0-9]/g, '');
                  return (
                    <article key={ord.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-bold text-slate-400">{ord.date}</p>
                          <h4 className="mt-1 truncate text-sm font-extrabold text-slate-900">{ord.title || 'Công may / Sửa đồ'}</h4>
                          <p className="mt-1 text-xs font-semibold text-slate-600">{ord.customerName || 'Khách lẻ'}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {isCompleted ? 'Đã hoàn thành' : 'Đang sửa'}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                        <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Thợ may</p><p className="mt-0.5 truncate font-bold text-blue-700">{ord.workerName}</p></div>
                        <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Thực thu</p><p className="mt-0.5 font-mono text-sm font-extrabold text-emerald-700">{formatVND(ord.finalAmount)}</p></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Số món</p><p className="mt-0.5 font-bold text-slate-700">{ord.items.length} món</p></div>
                        <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">SĐT</p>{cleanPhone ? <a href={`tel:${cleanPhone}`} className="mt-0.5 inline-block font-bold text-emerald-700">{ord.customerPhone}</a> : <p className="mt-0.5 font-bold text-slate-400">—</p>}</div>
                      </div>

                      {(onToggleOrderStatus || onEditOrder || onDeleteOrder) && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {onEditOrder && <button type="button" onClick={() => onEditOrder(ord)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700"><Pencil className="h-3.5 w-3.5" /> Sửa</button>}
                        {onToggleOrderStatus && <button type="button" onClick={() => onToggleOrderStatus(ord.id, isCompleted ? 'pending' : 'completed')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700"><RefreshCw className="h-3.5 w-3.5" /> Cập nhật</button>}
                        {onDeleteOrder && <button type="button" onClick={() => onDeleteOrder(ord.id)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>}
                      </div>}
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Mẫu / Đơn</th>
                      <th className="py-2.5 px-3">Khách hàng</th>
                      <th className="py-2.5 px-3">SĐT</th>
                      <th className="py-2.5 px-3">Thợ may</th>
                      <th className="py-2.5 px-3 text-right">Số món</th>
                      <th className="py-2.5 px-3 text-right">Thực thu</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      {(onToggleOrderStatus || onEditOrder || onDeleteOrder) && (
                        <th className="py-2.5 px-3 text-center">Hành động</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredOrders.map((ord) => {
                      const isCompleted = ord.status === 'completed' || ord.status === 'paid';
                      const cleanPhone = (ord.customerPhone || '').replace(/[^0-9]/g, '');

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                            {ord.date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {ord.title || 'Công may / Sửa đồ'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {ord.customerName || 'Khách lẻ'}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {cleanPhone ? (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {ord.customerPhone}
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-blue-700 font-semibold">
                            {ord.workerName}
                          </td>
                          <td className="py-2.5 px-3 text-right">{ord.items.length} món</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            {formatVND(ord.finalAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đã hoàn thành
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Đang sửa
                              </span>
                            )}
                          </td>
                          {(onToggleOrderStatus || onEditOrder || onDeleteOrder) && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {onEditOrder && (
                                  <button type="button" onClick={() => onEditOrder(ord)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100" title="Mở phiếu để sửa nội dung và tiền">
                                    <Pencil className="h-3 w-3" /> Sửa
                                  </button>
                                )}
                                {onToggleOrderStatus && (
                                  <button type="button" onClick={() => onToggleOrderStatus(ord.id, isCompleted ? 'pending' : 'completed')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100" title={isCompleted ? 'Chuyển đơn về trạng thái đang sửa' : 'Đánh dấu hoàn thành và cộng vào doanh thu'}>
                                    <RefreshCw className="h-3 w-3" /> Cập nhật
                                  </button>
                                )}
                                {onDeleteOrder && (
                                  <button type="button" onClick={() => onDeleteOrder(ord.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100" title="Xóa đơn vào vùng khôi phục">
                                    <Trash2 className="h-3 w-3" /> Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        {!embedded && <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Chủ tiệm: <span className="font-bold text-slate-800">{shopSettings.ownerName}</span> ({shopSettings.phone})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>In báo cáo</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcelXLSX}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tải file Excel (.xlsx)</span>
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
};
