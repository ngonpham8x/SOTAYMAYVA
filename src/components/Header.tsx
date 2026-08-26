import React from 'react';
import { History, Settings, BarChart3, Phone, User, ShieldCheck } from 'lucide-react';
import appLogo from '../assets/images/tailor_shop_logo_1787732514689.jpg';

interface HeaderProps {
  ownerName?: string;
  ownerPhone?: string;
  savedCount: number;
  onOpenHistory: () => void;
  onOpenStatistics: () => void;
  onOpenSettings: () => void;
  onOpenBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ownerName = 'Nguyễn Thị Ngọc',
  ownerPhone = '0339.272.127',
  savedCount,
  onOpenHistory,
  onOpenStatistics,
  onOpenSettings,
  onOpenBackup,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full gap-3">
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-blue-100 shrink-0 bg-blue-50 flex items-center justify-center">
              <img
                src={appLogo}
                alt="Logo Tiệm May & Sửa Đồ"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  Sổ May Thông Minh
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold shrink-0">
                  <User className="w-3 h-3 text-blue-600" />
                  {ownerName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
                <span className="sm:hidden text-blue-600 font-semibold">{ownerName}</span>
                <span className="hidden sm:inline">Bóc tách công đoạn & tính tiền may sửa</span>
                <span className="hidden md:inline text-slate-300">•</span>
                <span className="hidden md:inline-flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-emerald-600" /> {ownerPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions Bar - Equal Height & Professional Alignment */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Statistics Button */}
            <button
              id="btn-open-statistics"
              type="button"
              onClick={onOpenStatistics}
              className="h-9 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs active:scale-95"
              title="Xem báo cáo & thống kê thu nhập"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="hidden xs:inline">Thống kê</span>
            </button>

            {/* History Button */}
            <button
              id="btn-open-history"
              type="button"
              onClick={onOpenHistory}
              className="h-9 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs active:scale-95"
              title="Xem sổ lưu trữ đơn hàng đã lập"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span>Sổ tay</span>
              {savedCount > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-mono font-bold leading-none">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Backup & Recovery Button */}
            {onOpenBackup && (
              <button
                id="btn-open-backup"
                type="button"
                onClick={onOpenBackup}
                className="h-9 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs active:scale-95"
                title="Khôi phục dữ liệu, hoàn tác xóa & sao lưu email bí mật"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">Khôi phục</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              id="btn-open-settings"
              type="button"
              onClick={onOpenSettings}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs active:scale-95"
              title="Cài đặt thông tin tiệm may & tài khoản QR"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

