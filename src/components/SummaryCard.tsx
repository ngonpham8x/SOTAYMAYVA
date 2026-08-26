import React, { useState } from 'react';
import {
  Receipt,
  Share2,
  Copy,
  Check,
  Save,
  Printer,
  FileSpreadsheet,
  Calendar,
  User,
  Phone,
  Tag,
  Scissors,
  CheckCircle2,
  Sparkles,
  Clock,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { ParsedItem, ShopSettings, OrderCategory } from '../types';
import {
  calculateTotals,
  formatVND,
  numberToVietnameseWords,
  formatMessageForZalo,
} from '../utils/textParser';
import { downloadReceiptImage, exportToCSV } from '../utils/imageExporter';
import { exportCurrentOrderToExcel } from '../utils/excelExporter';

interface SummaryCardProps {
  items: ParsedItem[];
  title: string;
  onChangeTitle: (title: string) => void;
  workerName: string;
  onChangeWorkerName: (worker: string) => void;
  customerName: string;
  onChangeCustomerName: (customer: string) => void;
  customerPhone?: string;
  onChangeCustomerPhone?: (phone: string) => void;
  date: string;
  onChangeDate: (date: string) => void;
  category?: OrderCategory;
  onChangeCategory?: (cat: OrderCategory) => void;
  status?: 'pending' | 'completed' | 'paid';
  onChangeStatus?: (status: 'pending' | 'completed' | 'paid') => void;
  shopSettings: ShopSettings;
  onSaveOrder: () => void;
  onCompleteAndSaveOrder: () => void;
  onOpenReceiptModal: () => void;
  hasSaved?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  items,
  title,
  onChangeTitle,
  workerName,
  onChangeWorkerName,
  customerName,
  onChangeCustomerName,
  customerPhone = '',
  onChangeCustomerPhone,
  date,
  onChangeDate,
  category = 'alteration',
  onChangeCategory,
  status = 'completed',
  onChangeStatus,
  shopSettings,
  onSaveOrder,
  onCompleteAndSaveOrder,
  onOpenReceiptModal,
  hasSaved,
}) => {
  const [copiedZalo, setCopiedZalo] = useState(false);
  const calc = calculateTotals(items);

  const setToday = () => {
    onChangeDate(new Date().toISOString().split('T')[0]);
  };

  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    onChangeDate(d.toISOString().split('T')[0]);
  };

  const handleCopyZalo = async () => {
    const message = formatMessageForZalo(
      title,
      items,
      customerName,
      workerName,
      date
    );
    try {
      await navigator.clipboard.writeText(message);
      setCopiedZalo(true);
      setTimeout(() => setCopiedZalo(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleQuickDownloadImage = () => {
    downloadReceiptImage(
      title,
      items,
      shopSettings,
      customerName,
      workerName,
      date
    );
  };

  const handleExportExcelXLSX = () => {
    exportCurrentOrderToExcel({
      title,
      items,
      workerName,
      customerName,
      customerPhone,
      date,
      subtotal: calc.subtotal,
      advanceAmount: calc.advances,
      discountAmount: calc.discounts,
      finalAmount: calc.total,
      status,
      shopSettings,
    });
  };

  const handleExportCSV = () => {
    exportToCSV(title, items, customerName, workerName, date);
  };

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Total Banner Header in Slate-900 Dark Luxe */}
      <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              Tổng cộng thanh toán
            </span>
            {status === 'completed' || status === 'paid' ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành & cộng tiền
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Đang sửa / Chờ làm
              </span>
            )}
            {calc.advances > 0 && (
              <span className="text-rose-400 text-xs font-normal">
                (Đã trừ cọc: -{formatVND(calc.advances)})
              </span>
            )}
          </div>
          <span className="text-xs italic text-slate-300 font-medium">
            {numberToVietnameseWords(calc.total)}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
            {calc.total.toLocaleString('vi-VN')}
          </span>
          <span className="text-base font-semibold text-slate-400">VNĐ</span>
        </div>
      </div>

      {/* Breakdown Stats Strip */}
      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-center py-2.5 px-4 text-xs font-medium text-slate-600">
        <div>
          <span className="text-slate-400 mr-1">Hạng mục:</span>
          <span className="font-bold text-slate-800">{calc.itemCount} việc</span>
        </div>
        <div className="border-x border-slate-200">
          <span className="text-slate-400 mr-1">Tổng SL:</span>
          <span className="font-bold text-blue-700">{calc.totalQuantity}</span>
        </div>
        <div>
          <span className="text-slate-400 mr-1">Tổng tiền gốc:</span>
          <span className="font-bold text-slate-800 font-mono">{formatVND(calc.subtotal)}</span>
        </div>
      </div>

      {/* Meta details inputs */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Loại dịch vụ:
            </label>
            <select
              value={category}
              onChange={(e) => onChangeCategory?.(e.target.value as OrderCategory)}
              className="w-full text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800 cursor-pointer"
            >
              <option value="alteration">Sửa Quần Áo & Đồ Thuê</option>
              <option value="sewing">May Mới / Gia Công</option>
              <option value="rental">Cho Thuê Trang Phục</option>
              <option value="general">Khác / Tổng hợp</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <Tag className="w-3.5 h-3.5 text-blue-600" /> Tên mẫu / Mã đơn:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="Ví dụ: Sửa đầm, cắt gấu jean..."
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <User className="w-3.5 h-3.5 text-blue-600" /> Khách hàng sửa:
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onChangeCustomerName(e.target.value)}
              placeholder="Tên khách hàng"
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Customer Phone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> SĐT Khách:
              </label>
              {cleanPhone.length >= 9 && (
                <div className="flex items-center gap-1 text-[10px]">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="text-emerald-600 font-bold hover:underline"
                    title="Bấm gọi ngay"
                  >
                    Gọi
                  </a>
                  <span className="text-slate-300">|</span>
                  <a
                    href={`https://zalo.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline"
                    title="Nhắn Zalo"
                  >
                    Zalo
                  </a>
                </div>
              )}
            </div>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => onChangeCustomerPhone?.(e.target.value)}
              placeholder="0908xxxxxx"
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800 font-mono"
            />
          </div>

          {/* Worker Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <Scissors className="w-3.5 h-3.5 text-blue-600" /> Thợ phụ trách:
            </label>
            <input
              type="text"
              value={workerName}
              onChange={(e) => onChangeWorkerName(e.target.value)}
              placeholder="Tên thợ may"
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Ngày:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={setToday}
                  className="text-[10px] text-blue-600 hover:underline font-bold"
                >
                  Hôm nay
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={setYesterday}
                  className="text-[10px] text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Hôm qua
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg px-2.5 py-1.5 outline-hidden transition-all text-slate-800 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-4 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
        {/* Left Primary Group: 1-Click Complete & Save */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main user-requested button: Hoàn thành để tự động cộng tiền & cập nhật */}
          <button
            id="btn-complete-and-add"
            type="button"
            onClick={onCompleteAndSaveOrder}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95"
            title="Đánh dấu sửa xong và tự động cộng tiền vào doanh thu thống kê"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>✓ Bấm Hoàn Thành & Cộng Tiền</span>
          </button>

          <button
            id="btn-save-order"
            type="button"
            onClick={onSaveOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all"
            title="Lưu tạm vào sổ tay"
          >
            {hasSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu sổ</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-500" />
                <span>Lưu sổ tay</span>
              </>
            )}
          </button>

          <button
            id="btn-preview-receipt"
            type="button"
            onClick={onOpenReceiptModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Xem phiếu ảnh</span>
          </button>
        </div>

        {/* Right Secondary Group: XLSX Export, Zalo, PNG, Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-xlsx"
            type="button"
            onClick={handleExportExcelXLSX}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
            title="Xuất bảng tính thành file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            id="btn-copy-zalo"
            type="button"
            onClick={handleCopyZalo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
            title="Sao chép văn bản định dạng đẹp để gửi Zalo/Tin nhắn"
          >
            {copiedZalo ? (
              <>
                <Check className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 font-bold">Đã chép Zalo!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Chép Zalo</span>
              </>
            )}
          </button>

          <button
            id="btn-download-image"
            type="button"
            onClick={handleQuickDownloadImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
            title="Tải ảnh phiếu tính tiền PNG"
          >
            <Share2 className="w-4 h-4 text-blue-600" />
            <span>Tải ảnh</span>
          </button>

          <button
            id="btn-print-slip"
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
            title="In phiếu tính tiền"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
