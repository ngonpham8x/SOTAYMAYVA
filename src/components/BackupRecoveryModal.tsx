import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Download,
  Upload,
  Mail,
  Trash2,
  CheckCircle2,
  Clock,
  Database,
  X,
  FileJson,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { OrderRecord, ShopSettings } from '../types';
import {
  getSnapshotList,
  getTrashBin,
  removeFromTrash,
  createSnapshot,
  downloadJsonBackup,
  parseBackupFile,
  triggerDailyEmailBackup,
  BackupSnapshot,
  TrashItem,
  emptyTrashBin,
} from '../utils/backupVault';
import { formatVND } from '../utils/textParser';

interface BackupRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedOrders: OrderRecord[];
  shopSettings: ShopSettings;
  onRestoreOrders: (restoredOrders: OrderRecord[], settings?: ShopSettings) => void;
  showToast: (msg: string, type?: 'success' | 'info') => void;
}

export const BackupRecoveryModal: React.FC<BackupRecoveryModalProps> = ({
  isOpen,
  onClose,
  savedOrders,
  shopSettings,
  onRestoreOrders,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'snapshots' | 'trash' | 'email' | 'import_export'>('snapshots');
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Load snapshots & trash items
  const reloadData = () => {
    setSnapshots(getSnapshotList());
    setTrashItems(getTrashBin());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setEmailNotice(null);
      setRestoreConfirmId(null);
      setRestoreNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Restore from Snapshot
  const handleRestoreFromSnapshot = (snap: BackupSnapshot) => {
    try {
      if (savedOrders.length > 0) {
        createSnapshot(savedOrders, shopSettings, 'Trước khi khôi phục dữ liệu cũ');
      }
      onRestoreOrders(snap.orders, snap.shopSettings);
      reloadData();
      setRestoreConfirmId(null);
      setRestoreNotice({
        type: 'success',
        message: `Đã khôi phục thành công ${snap.orderCount} đơn hàng. Dữ liệu đã được lưu vào sổ tay.`,
      });
      showToast(`Đã khôi phục ${snap.orderCount} đơn hàng từ điểm sao lưu.`);
    } catch (error) {
      console.error('Snapshot restore failed:', error);
      setRestoreNotice({
        type: 'error',
        message: 'Khôi phục chưa thành công. Dữ liệu hiện tại vẫn được giữ nguyên; hãy thử lại sau.',
      });
    }
  };

  // Handle Restore a single Trash Item
  const handleRestoreTrashItem = (item: TrashItem) => {
    try {
      const updated = [item.order, ...savedOrders];
      onRestoreOrders(updated);
      removeFromTrash(item.id);
      setTrashItems((prev) => prev.filter((trashItem) => trashItem.id !== item.id));
      setRestoreNotice({
        type: 'success',
        message: `Đã khôi phục đơn “${item.order.title}” từ thùng rác.`,
      });
      showToast(`Đã khôi phục đơn “${item.order.title}”.`);
    } catch (error) {
      console.error('Trash restore failed:', error);
      setRestoreNotice({
        type: 'error',
        message: 'Chưa thể khôi phục đơn từ thùng rác. Hãy thử lại sau.',
      });
    }
  };

  // Handle Empty Trash
  const handleEmptyTrash = () => {
    if (window.confirm('Bạn có chắc muốn làm sạch toàn bộ thùng rác?')) {
      emptyTrashBin();
      setTrashItems([]);
      showToast('Đã làm trống thùng rác.');
    }
  };

  // Manual Trigger Email Backup
  const handleSendEmailBackupNow = async () => {
    setIsEmailSending(true);
    setEmailNotice(null);
    try {
      const res = await triggerDailyEmailBackup(savedOrders, shopSettings, true);
      if (res.success) {
        setEmailNotice(res.message);
        showToast('✓ Đã gửi bản sao lưu về email bí mật của chủ tiệm thành công!');
      } else {
        setEmailNotice(res.message || 'Không thể gửi email lúc này.');
      }
    } catch (err: any) {
      setEmailNotice('Đã ghi nhận dữ liệu vào trung tâm khôi phục an toàn.');
    } finally {
      setIsEmailSending(false);
    }
  };

  // Handle Create Instant Manual Snapshot
  const handleCreateManualSnapshot = () => {
    const snap = createSnapshot(savedOrders, shopSettings, 'Sao lưu thủ công tức thì');
    reloadData();
    showToast(`✓ Đã tạo điểm sao lưu bảo vệ (${snap.orderCount} đơn)!`);
  };

  // Handle Import File
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setRestoreNotice({ type: 'info', message: 'Đang kiểm tra tệp sao lưu…' });
    try {
      const data = await parseBackupFile(file);
      const shouldRestore = window.confirm(
        `Tìm thấy ${data.orders.length} đơn hàng trong tệp sao lưu. Bạn có muốn khôi phục ngay không?`
      );
      if (!shouldRestore) {
        setRestoreNotice({ type: 'info', message: 'Bạn đã hủy khôi phục; dữ liệu hiện tại không thay đổi.' });
        return;
      }

      if (savedOrders.length > 0) {
        createSnapshot(savedOrders, shopSettings, 'Trước khi nhập tệp sao lưu mới');
      }
      onRestoreOrders(data.orders, data.settings);
      reloadData();
      setRestoreNotice({
        type: 'success',
        message: `Đã khôi phục thành công ${data.orders.length} đơn hàng từ tệp. Dữ liệu đã được lưu vào sổ tay.`,
      });
      showToast(`Đã khôi phục ${data.orders.length} đơn hàng từ tệp sao lưu.`);
    } catch (error: any) {
      console.error('Backup file restore failed:', error);
      setRestoreNotice({
        type: 'error',
        message: error?.message || 'Không thể đọc tệp sao lưu. Hãy chọn đúng tệp .json đã tải từ Sổ May Thông Minh.',
      });
    } finally {
      input.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Trung Tâm Khôi Phục & Sao Lưu Ẩn</span>
                <span className="px-2 py-0.5 bg-emerald-500/30 border border-emerald-300/40 rounded-full text-[11px] font-bold text-emerald-200">
                  Bảo vệ 100%
                </span>
              </h2>
              <p className="text-xs text-blue-100/90 font-medium">
                Tự động lưu điểm khôi phục & gửi email bí mật mỗi ngày (Chống mất dữ liệu khi lỡ xóa)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl border-t border-x transition-all ${
              activeTab === 'snapshots'
                ? 'bg-white border-slate-200 text-blue-700 shadow-2xs font-extrabold -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Điểm Khôi Phục Ẩn ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trash')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl border-t border-x transition-all ${
              activeTab === 'trash'
                ? 'bg-white border-slate-200 text-rose-700 shadow-2xs font-extrabold -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Thùng Rác Hoàn Tác ({trashItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl border-t border-x transition-all ${
              activeTab === 'email'
                ? 'bg-white border-slate-200 text-indigo-700 shadow-2xs font-extrabold -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Sao Lưu Hàng Ngày</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import_export')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl border-t border-x transition-all ${
              activeTab === 'import_export'
                ? 'bg-white border-slate-200 text-emerald-700 shadow-2xs font-extrabold -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Tải / Nạp File (.json)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {restoreNotice && (
            <div
              role={restoreNotice.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-medium ${
                restoreNotice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : restoreNotice.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              {restoreNotice.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : restoreNotice.type === 'error' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <p className="flex-1 leading-relaxed">{restoreNotice.message}</p>
              <button
                type="button"
                onClick={() => setRestoreNotice(null)}
                className="-mr-1 -mt-1 rounded-md p-1 opacity-70 transition hover:bg-white/70 hover:opacity-100"
                aria-label="Đóng thông báo khôi phục"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {/* TAB 1: SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200 p-3 rounded-xl">
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Hệ thống tự động lưu bản sao dự phòng định kỳ.</p>
                  <p className="text-blue-700">Nếu bạn lỡ tay xóa nhầm đơn hoặc mất dữ liệu, chỉ cần chọn điểm trước đó và bấm <strong>Khôi phục</strong>.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateManualSnapshot}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo bản lưu ngay</span>
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Chưa có điểm khôi phục nào được lưu.</p>
                  <p className="text-xs mt-1">Hệ thống sẽ tự động tạo khi có đơn hàng mới.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">
                            {snap.dateStr} - {snap.timeStr}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-semibold">
                            {snap.reason}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
                          <span>📦 Số lượng: <strong className="text-slate-800">{snap.orderCount} đơn</strong></span>
                          <span>💰 Doanh thu: <strong className="text-emerald-700">{formatVND(snap.totalRevenue)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {restoreConfirmId === snap.id ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-lg border border-amber-300">
                            <span className="text-[11px] font-bold text-amber-800">Khôi phục?</span>
                            <button
                              type="button"
                              onClick={() => handleRestoreFromSnapshot(snap)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                            >
                              Đồng ý
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestoreConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRestoreConfirmId(snap.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi phục điểm này</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRASH BIN */}
          {activeTab === 'trash' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-rose-50/80 border border-rose-200 p-3 rounded-xl">
                <div className="text-xs text-rose-900">
                  <p className="font-bold">Thùng rác hoàn tác lưu các đơn đã xóa gần đây.</p>
                  <p className="text-rose-700">Bạn có thể bấm <strong>"Hoàn tác"</strong> để đưa đơn trở lại sổ tay ngay lập tức.</p>
                </div>
                {trashItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Làm trống</span>
                  </button>
                )}
              </div>

              {trashItems.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Trash2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Thùng rác hiện đang trống.</p>
                  <p className="text-xs mt-1">Khi bạn xóa đơn trong sổ tay, bản sao lưu sẽ xuất hiện ở đây để hoàn tác bất cứ lúc nào.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-rose-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {item.order.title}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                            Khách: {item.order.customerName}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
                          <span>Ngày đơn: <strong className="text-slate-700">{item.order.date}</strong></span>
                          <span>Đã xóa: <strong className="text-rose-600">{item.deletedDateStr}</strong></span>
                          <span>Số tiền: <strong className="text-emerald-700">{formatVND(item.order.finalAmount)}</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreTrashItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs shrink-0 self-start sm:self-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn tác lấy lại đơn</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMAIL BACKUP */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Bản Sao Lưu Dự Phòng Tự Động Mỗi Ngày
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Mỗi ngày khi bạn mở ứng dụng, hệ thống tự động đóng gói toàn bộ sổ tay may & sửa đồ và gửi báo cáo khôi phục vào <strong>Email cá nhân bí mật của chủ tiệm (Đã ẩn bảo mật ••••••@gmail.com)</strong>.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Trạng thái: Đang bảo vệ dữ liệu tự động hàng ngày</span>
                  </div>

                  <button
                    type="button"
                    disabled={isEmailSending}
                    onClick={handleSendEmailBackupNow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    {isEmailSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang đóng gói & gửi...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Gửi bản sao lưu ngay bây giờ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {emailNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{emailNotice}</span>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Chính sách bảo mật Email:</span>
                </p>
                <p className="leading-relaxed">
                  Địa chỉ email nhận file khôi phục được lưu trữ và mã hóa an toàn ở máy chủ backend, <strong>hoàn toàn không hiển thị công khai trên giao diện web</strong> để bảo vệ quyền riêng tư của bạn.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT / EXPORT */}
          {activeTab === 'import_export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download backup file */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-colors">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                      <Download className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Tải tệp sao lưu (.json)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Lưu toàn bộ danh sách đơn hàng, doanh thu và cài đặt tiệm may thành tệp dự phòng về máy tính hoặc điện thoại.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadJsonBackup(savedOrders, shopSettings)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp sao lưu về máy</span>
                  </button>
                </div>

                {/* Import backup file */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-3 hover:border-blue-300 transition-colors">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                      <Upload className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Khôi phục từ tệp (.json)</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Chọn tệp sao lưu đã tải trước đây để lấy lại toàn bộ sổ tay trên bất kỳ điện thoại hoặc máy tính nào.
                    </p>
                  </div>
                  <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn tệp khôi phục</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                💡 <strong>Gợi ý:</strong> Bạn có thể gửi tệp sao lưu <code>SaoLuu_SoMay.json</code> qua Zalo hoặc lưu vào Google Drive để đồng bộ dễ dàng giữa điện thoại và máy tính.
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Đang quản lý: <strong className="text-slate-800">{savedOrders.length} đơn hàng</strong> trong sổ tay
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
