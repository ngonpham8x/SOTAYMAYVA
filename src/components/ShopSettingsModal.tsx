import React, { useEffect, useState } from 'react';
import { X, Settings, Store, Phone, MapPin, User, FileText, Check, QrCode, CreditCard, Building } from 'lucide-react';
import { ShopSettings } from '../types';
import { getVietQrImageUrl, OFFICIAL_VIETQR_CARD_URL } from '../utils/vietQrHelper';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSave: (settings: ShopSettings) => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<ShopSettings>(() => ({
    ...settings,
    phone: settings.phone || '0339.272.127',
    bankName: settings.bankName || 'Eximbank',
    bankBin: settings.bankBin || 'Eximbank',
    bankAccount: settings.bankAccount || '100192186',
    bankAccountName: settings.bankAccountName || 'NGUYEN THI NGOC',
    bankBranch: settings.bankBranch || 'Eximbank Bảo Lộc',
    showQrOnReceipt: settings.showQrOnReceipt !== false,
  }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        phone: settings.phone || '0339.272.127',
        bankName: settings.bankName || 'Eximbank',
        bankBin: settings.bankBin || 'Eximbank',
        bankAccount: settings.bankAccount || '100192186',
        bankAccountName: settings.bankAccountName || 'NGUYEN THI NGOC',
        bankBranch: settings.bankBranch || 'Eximbank Bảo Lộc',
        showQrOnReceipt: settings.showQrOnReceipt !== false,
      });
      setSaved(false);
    }
  }, [isOpen, settings]);

  const saveChanges = () => {
    onSave(formData);
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveChanges();
  };

  const previewQrUrl = getVietQrImageUrl({
    bankBin: formData.bankBin || 'Eximbank',
    accountNo: formData.bankAccount || '100192186',
    accountName: formData.bankAccountName || 'NGUYEN THI NGOC',
    template: 'compact2',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Cài đặt tiệm & Mã QR Chuyển khoản
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin xuất trên phiếu tính tiền & mã VietQR thanh toán
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Thông tin tiệm cơ bản */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Store className="w-3.5 h-3.5 text-blue-600" /> Thông tin tiệm may
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" /> Tên tiệm may / Xưởng:
              </label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                placeholder="Ví dụ: TIỆM MAY NGUYỄN THỊ NGỌC"
                className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> SĐT Chủ tiệm / Zalo:
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="0339.272.127"
                  className="w-full text-xs sm:text-sm font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Tên chủ tiệm:
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  placeholder="Nguyễn Thị Ngọc"
                  className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Địa chỉ xưởng / tiệm:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Ví dụ: TP. Hồ Chí Minh"
                className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Cài đặt Tài Khoản Ngân Hàng & VietQR */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Tài khoản nhận tiền VietQR (Chuyển khoản)
              </h4>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-700">
                <input
                  type="checkbox"
                  checked={formData.showQrOnReceipt}
                  onChange={(e) =>
                    setFormData({ ...formData, showQrOnReceipt: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Hiện QR trên phiếu</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" /> Ngân hàng:
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                  placeholder="Eximbank"
                  className="w-full text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> Chi nhánh:
                </label>
                <input
                  type="text"
                  value={formData.bankBranch || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, bankBranch: e.target.value })
                  }
                  placeholder="Eximbank Bảo Lộc"
                  className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Số tài khoản (STK):
                </label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, bankAccount: e.target.value })
                  }
                  placeholder="100192186"
                  className="w-full text-xs sm:text-sm font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800 font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Tên chủ tài khoản:
                </label>
                <input
                  type="text"
                  value={formData.bankAccountName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccountName: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="NGUYEN THI NGOC"
                  className="w-full text-xs sm:text-sm font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800 uppercase"
                />
              </div>
            </div>

            {/* QR Preview Mini Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3.5">
              <div className="w-20 h-24 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <img
                  src={formData.bankAccount === '100192186' ? OFFICIAL_VIETQR_CARD_URL : previewQrUrl}
                  alt="VietQR Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  Mã QR Gốc Đính Kèm (100% Quét Được)
                </span>
                <p className="font-bold text-slate-900">
                  {formData.bankAccountName || 'NGUYEN THI NGOC'}
                </p>
                <p className="font-mono text-slate-600">
                  STK: <strong className="text-emerald-700">{formData.bankAccount || '100192186'}</strong>
                </p>
                <p className="text-slate-500 text-[11px]">
                  {formData.bankName || 'Eximbank'} ({formData.bankBranch || 'Bảo Lộc'})
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Lời cảm ơn chân trang phiếu:
            </label>
            <input
              type="text"
              value={formData.noteFooter}
              onChange={(e) =>
                setFormData({ ...formData, noteFooter: e.target.value })
              }
              placeholder="Cảm ơn quý khách đã tin tưởng và ủng hộ!"
              className="w-full text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all text-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={saveChanges}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" /> Đã lưu cài đặt!
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
