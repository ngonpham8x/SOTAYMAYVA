import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Copy,
  Printer,
  Check,
  Receipt,
  QrCode,
  CreditCard,
  Building,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ParsedItem, ShopSettings } from '../types';
import { generateReceiptCanvas, downloadReceiptImage } from '../utils/imageExporter';
import {
  getVietQrImageUrl,
  removeVietnameseTones,
  OFFICIAL_VIETQR_CARD_URL,
  OFFICIAL_QR_PNG_URL,
} from '../utils/vietQrHelper';
import { calculateTotals, formatVND } from '../utils/textParser';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ParsedItem[];
  shopSettings: ShopSettings;
  customerName?: string;
  workerName?: string;
  orderDate?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  shopSettings,
  customerName,
  workerName,
  orderDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'receipt' | 'vietqr'>('receipt');
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showQrOnSlip, setShowQrOnSlip] = useState(shopSettings.showQrOnReceipt !== false);

  // Support ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const calc = calculateTotals(items);
  const bankAccount = shopSettings.bankAccount || '100192186';
  const bankAccountName = shopSettings.bankAccountName || 'NGUYEN THI NGOC';
  const bankName = shopSettings.bankName || 'Eximbank';
  const bankBranch = shopSettings.bankBranch || 'Eximbank Bảo Lộc';
  const transferMemo = `Sua do Ngoc ${removeVietnameseTones(customerName || title || 'Khach').substring(0, 20)}`;

  const vietQrUrl = getVietQrImageUrl({
    bankBin: shopSettings.bankBin || 'Eximbank',
    accountNo: bankAccount,
    accountName: bankAccountName,
    amount: calc.total,
    description: transferMemo,
    template: 'compact2',
  });

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const effectiveSettings: ShopSettings = {
      ...shopSettings,
      showQrOnReceipt: showQrOnSlip,
    };
    const canvas = generateReceiptCanvas(
      title,
      items,
      effectiveSettings,
      customerName,
      workerName,
      orderDate
    );
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '12px';
    canvas.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvas);
  }, [isOpen, title, items, shopSettings, customerName, workerName, orderDate, showQrOnSlip]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const effectiveSettings: ShopSettings = {
      ...shopSettings,
      showQrOnReceipt: showQrOnSlip,
    };
    downloadReceiptImage(
      title,
      items,
      effectiveSettings,
      customerName,
      workerName,
      orderDate
    );
  };

  const handleCopyImage = async () => {
    const effectiveSettings: ShopSettings = {
      ...shopSettings,
      showQrOnReceipt: showQrOnSlip,
    };
    const canvas = generateReceiptCanvas(
      title,
      items,
      effectiveSettings,
      customerName,
      workerName,
      orderDate
    );
    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await (navigator.clipboard as any).write([
            new (window as any).ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        }
      });
    } catch {
      handleDownload();
    }
  };

  const handleCopyField = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(fieldId);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePrint = () => {
    const receiptCanvas = containerRef.current?.querySelector('canvas');
    if (!receiptCanvas) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.opener = null;
    const receiptImage = receiptCanvas.toDataURL('image/png');
    printWindow.document.write(`<!doctype html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Phiếu tính tiền</title>
          <style>
            @page { size: A4 portrait; margin: 7mm; }
            html, body { margin: 0; width: 100%; min-height: 0; background: #fff; }
            body { display: flex; justify-content: center; align-items: flex-start; }
            .receipt-page { width: 100%; height: 283mm; display: flex; justify-content: center; align-items: flex-start; overflow: hidden; }
            img { display: block; max-width: 100%; max-height: 283mm; width: auto; height: auto; object-fit: contain; break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <main class="receipt-page"><img src="${receiptImage}" alt="Phiếu tính tiền" /></main>
          <script>
            window.addEventListener('load', () => window.print());
            window.addEventListener('afterprint', () => window.close());
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  Phiếu tính tiền & QR
                </h3>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {formatVND(calc.total)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                Hotline: {shopSettings.phone || '0339.272.127'} | STK: {bankAccount} ({bankName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Tab switchers */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] sm:text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'receipt'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Phiếu ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vietqr')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'vietqr'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span>Mã VietQR</span>
              </button>
            </div>

            {/* Always visible prominent Close Button */}
            <button
              id="btn-close-receipt-header"
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors shrink-0 shadow-2xs"
              title="Đóng cửa sổ (Esc)"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100/70 flex-1">
          {activeTab === 'receipt' ? (
            <div className="space-y-4 flex flex-col items-center">
              {/* Option Bar */}
              <div className="w-full max-w-2xl bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showQrOnSlip}
                    onChange={(e) => setShowQrOnSlip(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Tích hợp khối mã QR chuyển khoản trực tiếp trên phiếu ảnh</span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveTab('vietqr')}
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Xem mã QR riêng phóng to
                </button>
              </div>

              {/* Canvas Container */}
              <div ref={containerRef} className="max-w-full flex justify-center" />
            </div>
          ) : (
            /* Dedicated Large VietQR Tab */
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-200 flex flex-col items-center text-center">
                <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-extrabold text-sm text-slate-800">
                      Mã QR Thanh Toán Gốc (VietQR Napas 24/7)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Eximbank Bảo Lộc
                  </span>
                </div>

                {/* QR Image Box - Display exact official VietQR card */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs max-w-xs w-full flex flex-col items-center mb-4">
                  <img
                    src={OFFICIAL_VIETQR_CARD_URL}
                    alt="VietQR Eximbank - Nguyễn Thị Ngọc"
                    className="w-full h-auto object-contain rounded-xl shadow-xs"
                  />
                  <div className="mt-2.5 flex items-center gap-2 w-full">
                    <a
                      href={OFFICIAL_VIETQR_CARD_URL}
                      download="VietQR_Eximbank_NguyenThiNgoc_100192186.jpg"
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải thẻ QR gốc
                    </a>
                    <a
                      href={OFFICIAL_QR_PNG_URL}
                      download="QR_Eximbank_100192186.jpg"
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải ảnh QR
                    </a>
                  </div>
                </div>

                {/* Account Details Copy Grid */}
                <div className="w-full space-y-2.5 text-xs text-left bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                  {/* Account Name */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900 uppercase font-bold">{bankAccountName}</strong>
                      <button
                        onClick={() => handleCopyField(bankAccountName, 'name')}
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Sao chép tên"
                      >
                        {copiedText === 'name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Số tài khoản (STK):</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-emerald-700 font-mono text-sm font-bold">{bankAccount}</strong>
                      <button
                        onClick={() => handleCopyField(bankAccount, 'stk')}
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Sao chép STK"
                      >
                        {copiedText === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Bank & Branch */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <strong className="text-slate-900">{bankName} - {bankBranch}</strong>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Số tiền thanh toán:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-blue-700 font-bold font-mono text-sm">{formatVND(calc.total)}</strong>
                      <button
                        onClick={() => handleCopyField(calc.total.toString(), 'amount')}
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Sao chép số tiền"
                      >
                        {copiedText === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Memo */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <code className="text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                        {transferMemo}
                      </code>
                      <button
                        onClick={() => handleCopyField(transferMemo, 'memo')}
                        className="text-blue-600 hover:text-blue-800 p-0.5"
                        title="Sao chép nội dung"
                      >
                        {copiedText === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner Hotline Contact */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between w-full">
                  <span>Chủ tiệm: <strong>{shopSettings.ownerName || 'Nguyễn Thị Ngọc'}</strong></span>
                  <span>Hotline/Zalo: <strong className="text-slate-800 font-mono">{shopSettings.phone || '0339.272.127'}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-close-receipt-footer"
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all active:scale-95"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Đóng / Hủy</span>
            </button>

            <button
              id="btn-copy-receipt-image"
              type="button"
              onClick={handleCopyImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
            >
              {copiedImage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Đã chép ảnh!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao chép ảnh (Zalo)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-receipt"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In phiếu</span>
            </button>

            <button
              id="btn-download-receipt-png"
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Tải ảnh PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
