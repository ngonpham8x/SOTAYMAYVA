import React, { useState } from 'react';
import {
  X,
  History,
  Search,
  Calendar,
  User,
  Trash2,
  ExternalLink,
  Scissors,
  Sparkles,
  Phone,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';
import { OrderRecord, ShopSettings } from '../types';
import { formatVND } from '../utils/textParser';
import { exportStatisticsToExcel } from '../utils/excelExporter';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  shopSettings: ShopSettings;
  onLoadOrder: (order: OrderRecord) => void;
  onDeleteOrder: (id: string) => void;
  onClearAll: () => void;
  onToggleOrderStatus?: (id: string, newStatus: 'pending' | 'completed' | 'paid') => void;
  onOpenBackup?: () => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  shopSettings,
  onLoadOrder,
  onDeleteOrder,
  onClearAll,
  onToggleOrderStatus,
  onOpenBackup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Extract unique workers
  const workers = Array.from(
    new Set(orders.map((o) => o.workerName).filter(Boolean))
  );

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      order.title.toLowerCase().includes(term) ||
      order.customerName.toLowerCase().includes(term) ||
      (order.customerPhone || '').toLowerCase().includes(term) ||
      order.workerName.toLowerCase().includes(term) ||
      order.items.some((it) => it.name.toLowerCase().includes(term));

    const matchesWorker =
      selectedWorker === 'all' || order.workerName === selectedWorker;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = order.date === todayStr;
    } else if (dateFilter === 'week') {
      matchesDate = order.date >= weekAgo;
    } else if (dateFilter === 'month') {
      matchesDate = order.date.startsWith(thisMonthStr);
    }

    const isCompleted = order.status === 'completed' || order.status === 'paid';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && isCompleted) ||
      (statusFilter === 'pending' && !isCompleted);

    return matchesSearch && matchesWorker && matchesDate && matchesStatus;
  });

  const totalCalculated = filteredOrders.reduce((sum, o) => sum + o.finalAmount, 0);

  const handleExportHistoryToExcel = () => {
    exportStatisticsToExcel({
      timeframeLabel: 'Sổ tay lưu trữ',
      stats: {
        totalRevenue: totalCalculated,
        totalOrders: filteredOrders.length,
        totalGarments: filteredOrders.reduce((s, o) => s + (o.items?.length || 0), 0),
        completedOrders: filteredOrders.filter((o) => o.status === 'completed').length,
        pendingOrders: filteredOrders.filter((o) => o.status !== 'completed').length,
      },
      orders: filteredOrders,
      shopSettings,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Sổ tay lưu trữ đơn & công thợ ({filteredOrders.length}/{orders.length})
              </h3>
              <p className="text-xs text-slate-500">
                Tổng doanh số đã lọc:{' '}
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  {formatVND(totalCalculated)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportHistoryToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
          {/* Quick Date & Status Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 mr-1">Thời gian:</span>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dateFilter === 'all'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dateFilter === 'today'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('week')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dateFilter === 'week'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('month')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  dateFilter === 'month'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tháng này
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 mr-1">Trạng thái:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded-md ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2 py-0.5 rounded-md ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✓ Đã hoàn thành
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2 py-0.5 rounded-md ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⏳ Đang sửa
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên khách, số điện thoại, mẫu sửa, thợ may..."
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg outline-hidden text-slate-800 transition-all"
              />
            </div>

            {workers.length > 0 && (
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="text-xs sm:text-sm bg-slate-50 hover:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-hidden text-slate-700 font-medium"
              >
                <option value="all">Tất cả thợ ({workers.length})</option>
                {workers.map((w) => (
                  <option key={w} value={w}>
                    Thợ: {w}
                  </option>
                ))}
              </select>
            )}

            {orders.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử đã lưu?')) {
                    onClearAll();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Chưa có bản ghi nào phù hợp.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isCompleted = order.status === 'completed' || order.status === 'paid';
              const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');

              return (
                <div
                  key={order.id}
                  className="p-4 bg-white hover:bg-blue-50/20 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {order.title || 'Chi tiết công may'}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {order.date}
                      </span>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã hoàn thành
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Đang sửa
                        </span>
                      )}
                      {order.category === 'alteration' && (
                        <span className="px-2 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                          Sửa đồ thuê
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {order.customerName && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          <User className="w-3 h-3 text-slate-500" />
                          Khách: <strong className="text-slate-800">{order.customerName}</strong>
                        </span>
                      )}
                      {order.customerPhone && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-mono font-semibold">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <a href={`tel:${cleanPhone}`} className="hover:underline">{order.customerPhone}</a>
                          {cleanPhone.length >= 9 && (
                            <a
                              href={`https://zalo.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 font-bold ml-1 hover:underline"
                            >
                              (Zalo)
                            </a>
                          )}
                        </span>
                      )}
                      {order.workerName && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200/70 font-medium">
                          <Scissors className="w-3 h-3 text-blue-600" />
                          Thợ: {order.workerName}
                        </span>
                      )}
                      <span className="text-slate-500 font-medium">
                        {order.items.length} việc
                      </span>
                    </div>

                    {/* Summary of items */}
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      {order.items.map((it) => `${it.name} (${formatVND(it.amount)})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right mr-1">
                      <p className="text-xs text-slate-400">Tổng tiền:</p>
                      <p className="font-bold text-base text-slate-900 font-mono">
                        {formatVND(order.finalAmount)}
                      </p>
                    </div>

                    {onToggleOrderStatus && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => onToggleOrderStatus(order.id, 'completed')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all active:scale-95"
                        title="Đánh dấu sửa xong và cộng tiền vào doanh thu"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn thành</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onLoadOrder(order);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                      title="Mở ra bảng tính để sửa hoặc in"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa đơn này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors"
                title="Mở trung tâm khôi phục, thùng rác hoàn tác và sao lưu email"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Khôi phục & Thùng rác</span>
              </button>
            )}
            <p className="text-xs text-slate-500 hidden sm:inline">
              Dữ liệu tự động lưu trữ và có bản sao lưu dự phòng.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
