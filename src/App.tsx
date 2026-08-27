/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { TextInputArea } from './components/TextInputArea';
import { ItemsTable } from './components/ItemsTable';
import { SummaryCard } from './components/SummaryCard';
import { AlterationCatalog } from './components/AlterationCatalog';
import { StatisticsModal } from './components/StatisticsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ImageOcrModal } from './components/ImageOcrModal';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { ShopSettingsModal } from './components/ShopSettingsModal';

import { BackupRecoveryModal } from './components/BackupRecoveryModal';
import { ParsedItem, OrderRecord, ShopSettings, OrderCategory } from './types';
import { parseSewingText, calculateTotals, formatVND } from './utils/textParser';
import {
  createSnapshot,
  addToTrash,
  checkAndRunDailyAutoBackup,
  queuePrivateBackup,
} from './utils/backupVault';
import { Check, Plus, ShieldCheck } from 'lucide-react';

const INITIAL_TEXT = '';

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'TIỆM MAY & SỬA ĐỒ NGUYỄN THỊ NGỌC',
  ownerName: 'Nguyễn Thị Ngọc',
  phone: '0339.272.127',
  address: 'TP. Hồ Chí Minh',
  defaultWorker: 'Nguyễn Thị Ngọc',
  defaultCustomer: 'Khách lẻ',
  noteFooter: 'Cảm ơn quý khách đã tin tưởng và đồng hành cùng tiệm may!',
  bankName: 'Eximbank',
  bankBin: 'Eximbank',
  bankAccount: '100192186',
  bankAccountName: 'NGUYEN THI NGOC',
  bankBranch: 'Eximbank Bảo Lộc',
  showQrOnReceipt: true,
};

export default function App() {
  // Input text & Order metadata state
  const [text, setText] = useState<string>(INITIAL_TEXT);
  const [title, setTitle] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [workerName, setWorkerName] = useState<string>('Nguyễn Thị Ngọc');
  const [category, setCategory] = useState<OrderCategory>('alteration');
  const [status, setStatus] = useState<'pending' | 'completed' | 'paid'>('completed');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Parsed Items
  const [items, setItems] = useState<ParsedItem[]>(() => parseSewingText(INITIAL_TEXT));

  // AI loading status & notifications
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isImageOcrOpen, setIsImageOcrOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Saved Orders in localStorage
  const [savedOrders, setSavedOrders] = useState<OrderRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sewing_saved_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((order) => !String(order?.id || '').startsWith('sample-'));
          if (cleaned.length !== parsed.length) localStorage.setItem('sewing_saved_orders', JSON.stringify(cleaned));
          return cleaned;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Shop Settings in localStorage
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    try {
      const stored = localStorage.getItem('sewing_shop_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        const phone =
          !parsed.phone || parsed.phone === '0901 234 567'
            ? '0339.272.127'
            : parsed.phone;
        const merged = { ...DEFAULT_SETTINGS, ...parsed, phone };
        return merged;
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Background daily automatic backup check on app startup
  useEffect(() => {
    if (savedOrders.length > 0) {
      checkAndRunDailyAutoBackup(savedOrders, shopSettings);
      queuePrivateBackup(savedOrders, shopSettings);
    }
  }, []);

  // Toast notification helper
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync parsing when user updates raw text
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    setHasSaved(false);
    if (newText.trim()) {
      const parsed = parseSewingText(newText);
      setItems(parsed);
    } else {
      setItems([]);
    }
  }, []);

  // Append text snippet from AlterationCatalog
  const handleAppendText = (snippet: string) => {
    const updatedText = text.trim() ? `${text}. ${snippet}` : snippet;
    handleTextChange(updatedText);
    showToast(`Đã thêm dịch vụ: "${snippet}"`);
  };

  // Directly add item from AlterationCatalog
  const handleDirectAddItem = (item: ParsedItem) => {
    setItems((prev) => [...prev, item]);
    setHasSaved(false);
    showToast(`Đã thêm vào bảng: ${item.name}`);
  };

  // Update specific item in table
  const handleUpdateItem = (id: string, updated: Partial<ParsedItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newItem = { ...item, ...updated };
          newItem.amount = newItem.quantity * newItem.unitPrice;
          return newItem;
        }
        return item;
      })
    );
    setHasSaved(false);
  };

  // Delete item from table
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setHasSaved(false);
  };

  // Add new blank row to table
  const handleAddItem = () => {
    const newItem: ParsedItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'Công đoạn / Món sửa mới',
      quantity: 1,
      unit: 'cái',
      unitPrice: 30000,
      amount: 30000,
      type: 'work',
    };
    setItems((prev) => [...prev, newItem]);
    setHasSaved(false);
  };

  // Duplicate an existing row
  const handleDuplicateItem = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const duplicated: ParsedItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${item.name} (bản sao)`,
    };
    setItems((prev) => [...prev, duplicated]);
    setHasSaved(false);
  };

  // Deep AI Parsing using Gemini API endpoint
  const handleAiParse = async () => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Lỗi khi nhận dạng với AI.');
      }

      const aiData = resData.data;
      if (aiData.title) setTitle(aiData.title);
      if (aiData.workerName) setWorkerName(aiData.workerName);
      if (aiData.customerName) setCustomerName(aiData.customerName);
      if (aiData.customerPhone) setCustomerPhone(aiData.customerPhone);

      if (Array.isArray(aiData.items) && aiData.items.length > 0) {
        const mappedItems: ParsedItem[] = aiData.items.map((it: any, index: number) => ({
          id: `ai-item-${Date.now()}-${index}`,
          name: it.name || `Công đoạn ${index + 1}`,
          quantity: it.quantity || 1,
          unit: it.unit || 'công',
          unitPrice: it.unitPrice || 0,
          amount: (it.quantity || 1) * (it.unitPrice || 0),
          type: it.type || 'work',
          note: it.note,
        }));
        setItems(mappedItems);
        showToast(
          resData.warning ||
            resData.message ||
            'AI đã bóc tách & chuẩn hóa danh sách công đoạn thành công!'
        );
      }
    } catch (err: any) {
      console.warn('AI Parsing fallback triggered:', err);
      showToast('Đã bóc tách tự động & tính xong chi tiết công đoạn.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle successful OCR from Image Upload / Camera
  const handleImageOcrSuccess = (data: any) => {
    if (data.title) setTitle(data.title);
    if (data.workerName) setWorkerName(data.workerName);
    if (data.customerName) setCustomerName(data.customerName);
    if (data.customerPhone) setCustomerPhone(data.customerPhone);

    if (Array.isArray(data.items) && data.items.length > 0) {
      const mappedItems: ParsedItem[] = data.items.map((it: any, index: number) => ({
        id: `ocr-item-${Date.now()}-${index}`,
        name: it.name || `Công đoạn ${index + 1}`,
        quantity: it.quantity || 1,
        unit: it.unit || 'công',
        unitPrice: it.unitPrice || 0,
        amount: (it.quantity || 1) * (it.unitPrice || 0),
        type: it.type || 'work',
        note: it.note,
      }));
      setItems(mappedItems);
      // Construct clean text summary
      const constructedText = mappedItems
        .map((m) => `${m.name} ${m.unitPrice / 1000}k`)
        .join('. ');
      setText(constructedText);
      showToast('Đã tự động đọc & điền chi tiết vào bảng thành công!');
    }
  };

  // Save current order helper
  const saveOrderToStorage = (targetStatus: 'pending' | 'completed' | 'paid' = status) => {
    if (items.length === 0) {
      alert('Chưa có công đoạn nào để lưu.');
      return false;
    }

    const calc = calculateTotals(items);
    const newRecord: OrderRecord = {
      id: `order-${Date.now()}`,
      title: title || 'Chi tiết công may / sửa đồ',
      workerName: workerName || shopSettings.ownerName,
      customerName: customerName || 'Khách lẻ',
      customerPhone: customerPhone || undefined,
      date: orderDate,
      rawText: text,
      category: category,
      items: [...items],
      subtotal: calc.subtotal,
      advanceAmount: calc.advances,
      discountAmount: calc.discounts,
      finalAmount: calc.total,
      status: targetStatus,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newRecord, ...savedOrders];
    setSavedOrders(updated);
    try {
      localStorage.setItem('sewing_saved_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    queuePrivateBackup(updated, shopSettings);
    setHasSaved(true);
    return { record: newRecord, total: calc.total };
  };

  // Standard Save
  const handleSaveOrder = () => {
    const res = saveOrderToStorage(status);
    if (res) {
      showToast(`Đã lưu sổ tay ngày ${orderDate}!`);
    }
  };

  // 1-Click "Hoàn thành & Tự động cộng tiền"
  const handleCompleteAndSaveOrder = () => {
    setStatus('completed');
    const res = saveOrderToStorage('completed');
    if (res) {
      showToast(
        `✓ ĐÃ HOÀN THÀNH & TỰ ĐỘNG CỘNG ${formatVND(res.total)} VÀO DOANH THU!`,
        'success'
      );
    }
  };

  // Toggle order status from modal
  const handleToggleOrderStatus = (id: string, newStatus: 'pending' | 'completed' | 'paid') => {
    const updated = savedOrders.map((o) =>
      o.id === id ? { ...o, status: newStatus, updatedAt: Date.now() } : o
    );
    setSavedOrders(updated);
    try {
      localStorage.setItem('sewing_saved_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    queuePrivateBackup(updated, shopSettings);
    const target = updated.find((o) => o.id === id);
    if (newStatus === 'completed') {
      showToast(`✓ Đã đánh dấu hoàn thành & cộng ${formatVND(target?.finalAmount || 0)} vào thống kê!`);
    } else {
      showToast(`Đã chuyển đơn về trạng thái Đang sửa / Chờ làm.`);
    }
  };

  // Load an order from history into current workspace
  const handleLoadOrder = (order: OrderRecord) => {
    setTitle(order.title);
    setWorkerName(order.workerName);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || '');
    setOrderDate(order.date);
    if (order.category) setCategory(order.category);
    if (order.status) setStatus(order.status);
    setText(order.rawText || order.items.map((i) => `${i.name} ${i.unitPrice / 1000}k`).join('. '));
    setItems(order.items);
    setHasSaved(true);
    showToast(`Đã mở lại đơn ngày ${order.date}: "${order.title}"`);
  };

  // Delete an order from history with trash bin & auto-snapshot protection
  const handleDeleteOrder = (id: string) => {
    const targetOrder = savedOrders.find((o) => o.id === id);
    if (targetOrder) {
      // Save to recycle trash bin for instant 1-click undo
      addToTrash(targetOrder);
      // Create a safety snapshot before removing
      createSnapshot(savedOrders, shopSettings, `Trước khi xóa đơn "${targetOrder.title}"`);
      // Keep the pre-delete recovery copy in private storage as well.
      queuePrivateBackup(savedOrders, shopSettings);
    }

    const updated = savedOrders.filter((o) => o.id !== id);
    setSavedOrders(updated);
    try {
      localStorage.setItem('sewing_saved_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast('Đã xóa đơn. Bạn có thể bấm "Khôi phục" để hoàn tác lấy lại bất cứ lúc nào!');
  };

  // Clear all saved history with safety snapshot
  const handleClearAllHistory = () => {
    if (savedOrders.length > 0) {
      createSnapshot(savedOrders, shopSettings, 'Trước khi xóa toàn bộ sổ tay');
      queuePrivateBackup(savedOrders, shopSettings);
    }
    setSavedOrders([]);
    localStorage.removeItem('sewing_saved_orders');
    showToast('Đã xóa toàn bộ sổ tay. Bạn có thể vào mục "Khôi phục" để lấy lại dữ liệu!');
  };

  // Restore orders from backup snapshot or file
  const handleRestoreOrders = (restoredOrders: OrderRecord[], restoredSettings?: ShopSettings) => {
    setSavedOrders(restoredOrders);
    try {
      localStorage.setItem('sewing_saved_orders', JSON.stringify(restoredOrders));
    } catch (e) {
      console.error(e);
    }
    if (restoredSettings) {
      setShopSettings(restoredSettings);
      try {
        localStorage.setItem('sewing_shop_settings', JSON.stringify(restoredSettings));
      } catch (e) {
        console.error(e);
      }
    }
    if (restoredOrders.length > 0) {
      queuePrivateBackup(restoredOrders, restoredSettings || shopSettings);
    }
  };

  // Save Shop Settings
  const handleSaveSettings = (newSettings: ShopSettings) => {
    setShopSettings(newSettings);
    try {
      localStorage.setItem('sewing_shop_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
    if (savedOrders.length > 0) {
      queuePrivateBackup(savedOrders, newSettings);
    }
    showToast('Đã lưu cài đặt tiệm may!');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-gray-900 flex flex-col font-sans">
      {/* App Header */}
      <Header
        ownerName={shopSettings.ownerName || 'Nguyễn Thị Ngọc'}
        ownerPhone={shopSettings.phone || '0339.272.127'}
        savedCount={savedOrders.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenStatistics={() => document.getElementById('home-statistics')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700/80">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-sm font-bold tracking-tight">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1 w-full space-y-5 sm:space-y-6">
        <StatisticsModal
          isOpen
          embedded
          onClose={() => undefined}
          orders={savedOrders}
          shopSettings={shopSettings}
          onToggleOrderStatus={handleToggleOrderStatus}
        />

        {!isWorkspaceOpen ? (
          <section className="rounded-3xl border border-dashed border-blue-200 bg-white p-5 shadow-xs sm:p-8">
            <button
              id="btn-open-workspace"
              type="button"
              onClick={() => setIsWorkspaceOpen(true)}
              className="group flex w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-600 px-5 py-9 text-center text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/35 bg-white/15 transition group-hover:scale-110">
                <Plus className="h-11 w-11" strokeWidth={2.5} />
              </span>
              <span className="mt-4 text-lg font-extrabold">Tạo phiếu mới</span>
              <span className="mt-1 text-sm text-blue-100">Bấm dấu cộng để nhập nội dung, quét ảnh sổ tay hoặc thêm dịch vụ.</span>
            </button>
          </section>
        ) : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Nhập phiếu mới</h2>
                <p className="mt-0.5 text-xs text-slate-600">Thêm nội dung, quét ảnh sổ tay hoặc chọn dịch vụ và đơn giá.</p>
              </div>
              <button type="button" onClick={() => setIsWorkspaceOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
                Ẩn phần nhập
              </button>
            </section>

            <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
              <div className="flex flex-col lg:col-span-7">
                <TextInputArea
                  text={text}
                  onChangeText={handleTextChange}
                  onAiParse={handleAiParse}
                  onOpenImageOcr={() => setIsImageOcrOpen(true)}
                  isAiLoading={isAiLoading}
                />
              </div>
              <div className="flex flex-col lg:col-span-5">
                <AlterationCatalog onAppendText={handleAppendText} onDirectAddItem={handleDirectAddItem} />
              </div>
            </div>

            <div className="w-full">
              <ItemsTable
                items={items}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onDuplicateItem={handleDuplicateItem}
              />
            </div>

            <div className="w-full">
              <SummaryCard
                items={items}
                title={title}
                onChangeTitle={setTitle}
                workerName={workerName}
                onChangeWorkerName={setWorkerName}
                customerName={customerName}
                onChangeCustomerName={setCustomerName}
                customerPhone={customerPhone}
                onChangeCustomerPhone={setCustomerPhone}
                date={orderDate}
                onChangeDate={setOrderDate}
                category={category}
                onChangeCategory={setCategory}
                status={status}
                onChangeStatus={setStatus}
                shopSettings={shopSettings}
                onSaveOrder={handleSaveOrder}
                onCompleteAndSaveOrder={handleCompleteAndSaveOrder}
                onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
                hasSaved={hasSaved}
              />
            </div>

            <div className="flex justify-center pt-2">
              <button
                id="btn-open-backup-bottom"
                type="button"
                onClick={() => setIsBackupOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-50"
              >
                <ShieldCheck className="h-4 w-4" /> Khôi phục & sao lưu riêng tư
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={title}
        items={items}
        shopSettings={shopSettings}
        customerName={customerName}
        workerName={workerName}
        orderDate={orderDate}
      />

      <ImageOcrModal
        isOpen={isImageOcrOpen}
        onClose={() => setIsImageOcrOpen(false)}
        onSuccess={handleImageOcrSuccess}
      />

      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={savedOrders}
        shopSettings={shopSettings}
        onLoadOrder={handleLoadOrder}
        onDeleteOrder={handleDeleteOrder}
        onClearAll={handleClearAllHistory}
        onToggleOrderStatus={handleToggleOrderStatus}
        onOpenBackup={() => {
          setIsHistoryOpen(false);
          setIsBackupOpen(true);
        }}
      />


      <ShopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={shopSettings}
        onSaveSettings={handleSaveSettings}
      />

      <BackupRecoveryModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        savedOrders={savedOrders}
        shopSettings={shopSettings}
        onRestoreOrders={handleRestoreOrders}
        showToast={showToast}
      />
    </div>
  );
}
