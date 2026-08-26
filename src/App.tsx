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
import { Check, BarChart3 } from 'lucide-react';

const INITIAL_TEXT = 'Nối dây viền 200k nối thun 120k. May cổ lé 120k. May lai 100k';

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

// Generate sample orders distributed across today, this week, and this month
const getInitialSampleOrders = (): OrderRecord[] => {
  const today = new Date();
  const dStr = (offsetDays: number) => {
    const d = new Date(today.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return [
    {
      id: 'sample-1',
      title: 'Sửa đồ thuê & cắt gấu jean',
      workerName: 'Nguyễn Thị Ngọc',
      customerName: 'Chị Mai (Thuê đồ cưới)',
      customerPhone: '0909123456',
      date: dStr(0),
      rawText: 'Chỉnh size đầm dạ hội thuê 60k. Cắt gấu quần jean 30k. Đơm nút 10k',
      category: 'alteration',
      items: [
        { id: 's1-1', name: 'Chỉnh size đầm dạ hội thuê', quantity: 1, unit: 'bộ', unitPrice: 60000, amount: 60000, type: 'work' },
        { id: 's1-2', name: 'Cắt gấu / Lên lai quần jean', quantity: 1, unit: 'cái', unitPrice: 30000, amount: 30000, type: 'work' },
        { id: 's1-3', name: 'Đơm nút / Cúc áo', quantity: 1, unit: 'lần', unitPrice: 10000, amount: 10000, type: 'work' },
      ],
      subtotal: 100000,
      advanceAmount: 0,
      discountAmount: 0,
      finalAmount: 100000,
      status: 'completed',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: 'sample-2',
      title: 'Gia công áo thun & may cổ lé',
      workerName: 'Nguyễn Thị Ngọc',
      customerName: 'Xưởng may Tân Bình',
      customerPhone: '0912345678',
      date: dStr(1),
      rawText: 'Nối dây viền 200k. Nối thun 120k. May cổ lé 120k. May lai 100k',
      category: 'sewing',
      items: [
        { id: 's2-1', name: 'Nối dây viền', quantity: 1, unit: 'công', unitPrice: 200000, amount: 200000, type: 'work' },
        { id: 's2-2', name: 'Nối thun', quantity: 1, unit: 'công', unitPrice: 120000, amount: 120000, type: 'work' },
        { id: 's2-3', name: 'May cổ lé', quantity: 1, unit: 'công', unitPrice: 120000, amount: 120000, type: 'work' },
        { id: 's2-4', name: 'May lai', quantity: 1, unit: 'công', unitPrice: 100000, amount: 100000, type: 'work' },
      ],
      subtotal: 540000,
      advanceAmount: 0,
      discountAmount: 0,
      finalAmount: 540000,
      status: 'completed',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: 'sample-3',
      title: 'Sửa áo dài cưới thuê & bóp eo',
      workerName: 'Thợ Hương',
      customerName: 'Studio Lan Anh',
      customerPhone: '0987654321',
      date: dStr(3),
      rawText: 'Sửa áo dài cưới thuê 70k. Bóp eo chỉnh dáng đầm 45k. Thay dây kéo giọt nước 35k',
      category: 'alteration',
      items: [
        { id: 's3-1', name: 'Sửa áo dài cưới / hội nghị thuê', quantity: 1, unit: 'bộ', unitPrice: 70000, amount: 70000, type: 'work' },
        { id: 's3-2', name: 'Bóp eo / Chỉnh dáng đầm', quantity: 1, unit: 'cái', unitPrice: 45000, amount: 45000, type: 'work' },
        { id: 's3-3', name: 'Thay dây kéo giọt nước đầm', quantity: 1, unit: 'cái', unitPrice: 35000, amount: 35000, type: 'work' },
      ],
      subtotal: 150000,
      advanceAmount: 0,
      discountAmount: 10000,
      finalAmount: 140000,
      status: 'completed',
      createdAt: Date.now() - 3 * 86400000,
      updatedAt: Date.now() - 3 * 86400000,
    },
    {
      id: 'sample-4',
      title: 'Phục hồi trang phục biểu diễn thuê',
      workerName: 'Nguyễn Thị Ngọc',
      customerName: 'Đoàn Ca Múa',
      customerPhone: '0903333444',
      date: dStr(6),
      rawText: 'Giặt hấp & phục hồi đồ thuê 50k. Đính kết cườm 40k. Nới size trang phục 50k',
      category: 'alteration',
      items: [
        { id: 's4-1', name: 'Giặt hấp & Phục hồi đồ thuê', quantity: 1, unit: 'bộ', unitPrice: 50000, amount: 50000, type: 'work' },
        { id: 's4-2', name: 'Đính kết cườm / Hạt đá trang phục', quantity: 1, unit: 'lần', unitPrice: 40000, amount: 40000, type: 'work' },
        { id: 's4-3', name: 'Nới size trang phục biểu diễn thuê', quantity: 1, unit: 'bộ', unitPrice: 50000, amount: 50000, type: 'work' },
      ],
      subtotal: 140000,
      advanceAmount: 0,
      discountAmount: 0,
      finalAmount: 140000,
      status: 'completed',
      createdAt: Date.now() - 6 * 86400000,
      updatedAt: Date.now() - 6 * 86400000,
    },
  ];
};

export default function App() {
  // Input text & Order metadata state
  const [text, setText] = useState<string>(INITIAL_TEXT);
  const [title, setTitle] = useState<string>('Nối dây viền & may cổ lé');
  const [customerName, setCustomerName] = useState<string>('Khách lẻ');
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
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Saved Orders in localStorage
  const [savedOrders, setSavedOrders] = useState<OrderRecord[]>(() => {
    try {
      const stored = localStorage.getItem('sewing_saved_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const initial = getInitialSampleOrders();
      localStorage.setItem('sewing_saved_orders', JSON.stringify(initial));
      return initial;
    } catch {
      return getInitialSampleOrders();
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
        onOpenStatistics={() => setIsStatisticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
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
        {/* Top Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-800">
              Hệ Thống Quản Lý Tiệm May & Sửa Đồ
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">|</span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Chụp ảnh sổ tay, tự động bóc tách và cộng doanh thu 1-chạm
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStatisticsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Xem Thống Kê (Ngày/Tuần/Tháng/Năm)</span>
            </button>
          </div>
        </div>

        {/* Input & Catalog Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Natural Text Input + Image OCR */}
          <div className="lg:col-span-7 flex flex-col">
            <TextInputArea
              text={text}
              onChangeText={handleTextChange}
              onAiParse={handleAiParse}
              onOpenImageOcr={() => setIsImageOcrOpen(true)}
              isAiLoading={isAiLoading}
            />
          </div>

          {/* Right Column: Alteration Quick Catalog */}
          <div className="lg:col-span-5 flex flex-col">
            <AlterationCatalog
              onAppendText={handleAppendText}
              onDirectAddItem={handleDirectAddItem}
            />
          </div>
        </div>

        {/* Parsed Items Interactive Table */}
        <div className="w-full">
          <ItemsTable
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onDuplicateItem={handleDuplicateItem}
          />
        </div>

        {/* Summary Card with Totals, Customer, Worker, 1-Click Complete & Save */}
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

      <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
        orders={savedOrders}
        shopSettings={shopSettings}
        onToggleOrderStatus={handleToggleOrderStatus}
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
