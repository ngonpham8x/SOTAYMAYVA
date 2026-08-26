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
} from 'lucide-react';
import { OrderRecord, ShopSettings, StatsTimeframe } from '../types';
import { formatVND } from '../utils/textParser';
import { exportStatisticsToExcel } from '../utils/excelExporter';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  shopSettings: ShopSettings;
  onToggleOrderStatus?: (id: string, newStatus: 'pending' | 'completed' | 'paid') => void;
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
  orders,
  shopSettings,
  onToggleOrderStatus,
}) => {
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month');
  const [referenceDate, setReferenceDate] = useState<string>(() =>
    formatDateString(new Date())
  );
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed_only' | 'pending_only'>('all');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
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
        </div>

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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Doanh Thu */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng Doanh Thu
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">VNĐ</span>
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Đã hoàn thành: {stats.completedOrders} đơn
                </p>
              </div>
            </div>

            {/* KPI 2: Số Đơn Hàng */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Số Đơn Sửa / May
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.totalOrders} <span className="text-xs font-semibold text-slate-400">đơn</span>
                </p>
                <p className="text-[11px] text-amber-700 font-semibold mt-1">
                  Đang làm: {stats.pendingOrders} đơn
                </p>
              </div>
            </div>

            {/* KPI 3: Số Món / Công Đoạn */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Số Món / Công Đoạn
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.totalGarments} <span className="text-xs font-semibold text-slate-400">món</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Đã thực hiện xong
                </p>
              </div>
            </div>

            {/* KPI 4: Giá Trị Trung Bình */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  TB Mỗi Đơn
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.avgOrderValue.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-400">VNĐ</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Doanh số trung bình
                </p>
              </div>
            </div>
          </div>

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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
              <div className="overflow-x-auto">
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
                      {onToggleOrderStatus && (
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
                          {onToggleOrderStatus && (
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleOrderStatus(
                                    ord.id,
                                    isCompleted ? 'pending' : 'completed'
                                  )
                                }
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                  isCompleted
                                    ? 'text-slate-500 hover:bg-slate-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                              >
                                {isCompleted ? 'Chuyển về Đang sửa' : '✓ Bấm Hoàn Thành'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
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
        </div>
      </div>
    </div>
  );
};
