/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TextInputArea } from './components/TextInputArea';
import { ItemsTable } from './components/ItemsTable';
import { SummaryCard } from './components/SummaryCard';
import { AlterationCatalog } from './components/AlterationCatalog';
import { StatisticsModal } from './components/StatisticsModal';
import { DashboardStats } from './components/DashboardStats';
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
  fetchPrivateBackup,
  queuePrivateBackup,
} from './utils/backupVault';
import { ArrowLeft, Check, Eye, EyeOff, GripVertical, Plus, ShieldCheck } from 'lucide-react';

const INITIAL_TEXT = '';

function mergeOrders(localOrders: OrderRecord[], remoteOrders: OrderRecord[]): OrderRecord[] {
  const byId = new Map<string, OrderRecord>();
  [...localOrders, ...remoteOrders].forEach((order) => {
    const current = byId.get(order.id);
    const currentUpdatedAt = Number(current?.updatedAt) || Number(current?.createdAt) || 0;
    const orderUpdatedAt = Number(order.updatedAt) || Number(order.createdAt) || 0;
    if (!current || orderUpdatedAt >= currentUpdatedAt) byId.set(order.id, order);
  });
  return [...byId.values()].sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
}

function orderListsMatch(first: OrderRecord[], second: OrderRecord[]): boolean {
  if (first.length !== second.length) return false;
  return first.every((order, index) => {
    const compared = second[index];
    return order.id === compared?.id &&
      (Number(order.updatedAt) || Number(order.createdAt) || 0) ===
      (Number(compared.updatedAt) || Number(compared.createdAt) || 0);
  });
}

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
  const [items, setItems] = useState<ParsedItem[]>([]);

  // AI loading status & notifications
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (completedOrder && items.length > 0) setCompletedOrder(null);
  }, [completedOrder, items.length]);

  // Modals state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isImageOcrOpen, setIsImageOcrOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'entry'>('dashboard');
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(true);
  const [quickAddOffset, setQuickAddOffset] = useState({ x: 0, y: 0 });
  const quickAddDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const quickAddMovedRef = useRef(false);
  const isBlockingOverlayOpen = isReceiptModalOpen || isImageOcrOpen || isHistoryOpen || isSettingsOpen || isBackupOpen;

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
  const savedOrdersRef = useRef(savedOrders);
  const shopSettingsRef = useRef<ShopSettings>(DEFAULT_SETTINGS);
  const remoteSnapshotTimestampRef = useRef(0);

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

  useEffect(() => {
    savedOrdersRef.current = savedOrders;
  }, [savedOrders]);

  useEffect(() => {
    shopSettingsRef.current = shopSettings;
  }, [shopSettings]);

  // Background daily automatic backup check on app startup
  useEffect(() => {
    if (savedOrdersRef.current.length > 0) {
      checkAndRunDailyAutoBackup(savedOrdersRef.current, shopSettingsRef.current);
    }
  }, []);

  // Toast notification helper
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let disposed = false;
    const applyRemoteSnapshot = async () => {
      const remoteResult = await fetchPrivateBackup();
      if (disposed || remoteResult.state === 'unavailable') return;
      if (remoteResult.state === 'missing') {
        if (savedOrdersRef.current.length > 0) {
          queuePrivateBackup(savedOrdersRef.current, shopSettingsRef.current);
        }
        return;
      }
      const snapshot = remoteResult.snapshot;
      if (snapshot.timestamp <= remoteSnapshotTimestampRef.current) return;
      remoteSnapshotTimestampRef.current = snapshot.timestamp;
      const mergedOrders = mergeOrders(savedOrdersRef.current, snapshot.orders);
      if (!orderListsMatch(savedOrdersRef.current, mergedOrders)) {
        savedOrdersRef.current = mergedOrders;
        setSavedOrders(mergedOrders);
        try {
          localStorage.setItem('sewing_saved_orders', JSON.stringify(mergedOrders));
        } catch (error) {
          console.warn('Could not persist synced orders:', error);
        }
        showToast('Đã tự đồng bộ dữ liệu mới nhất.', 'info');
      }
      if (snapshot.shopSettings) {
        const nextSettings = { ...DEFAULT_SETTINGS, ...snapshot.shopSettings };
        if (JSON.stringify(shopSettingsRef.current) !== JSON.stringify(nextSettings)) {
          shopSettingsRef.current = nextSettings;
          setShopSettings(nextSettings);
          try {
            localStorage.setItem('sewing_shop_settings', JSON.stringify(nextSettings));
          } catch (error) {
            console.warn('Could not persist synced settings:', error);
          }
        }
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'sewing_saved_orders' || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue);
        if (!Array.isArray(incoming)) return;
        savedOrdersRef.current = incoming;
        setSavedOrders(incoming);
      } catch {
        // Ignore malformed data from another tab.
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void applyRemoteSnapshot();
    };
    void applyRemoteSnapshot();
    const syncTimer = window.setInterval(() => void applyRemoteSnapshot(), 15_000);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      window.clearInterval(syncTimer);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);


  const resetOrderDraft = () => {
    setText('');
    setItems([]);
    setTitle('');
    setCustomerName('');
    setCustomerPhone('');
    setWorkerName(shopSettingsRef.current.ownerName || 'Nguyễn Thị Ngọc');
    setCategory('alteration');
    setStatus('pending');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setHasSaved(false);
    setEditingOrderId(null);
    setCompletedOrder(null);
  };

  const openOrderEntry = () => {
    resetOrderDraft();
    setActiveScreen('entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeOrderEntry = () => {
    setActiveScreen('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAddDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    quickAddMovedRef.current = false;
    quickAddDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: quickAddOffset.x,
      originY: quickAddOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleQuickAddDragMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = quickAddDragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) quickAddMovedRef.current = true;
    const x = Math.max(-Math.max(window.innerWidth - 230, 0), Math.min(16, drag.originX + deltaX));
    const y = Math.max(-Math.max(window.innerHeight - 152, 0), Math.min(16, drag.originY + deltaY));
    setQuickAddOffset({ x, y });
  };

  const handleQuickAddDragEnd = () => {
    quickAddDragRef.current = null;
  };

  const handleQuickAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (quickAddMovedRef.current) {
      quickAddMovedRef.current = false;
      return;
    }
    openOrderEntry();
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
    const now = Date.now();
    const existingOrder = editingOrderId
      ? savedOrders.find((order) => order.id === editingOrderId)
      : undefined;
    const newRecord: OrderRecord = {
      id: existingOrder?.id || `order-${now}`,
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
      createdAt: existingOrder?.createdAt || now,
      updatedAt: now,
    };

    const updated = existingOrder
      ? savedOrders.map((order) => (order.id === existingOrder.id ? newRecord : order))
      : [newRecord, ...savedOrders];
    setSavedOrders(updated);
    try {
      localStorage.setItem('sewing_saved_orders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    queuePrivateBackup(updated, shopSettings);
    setHasSaved(true);
    return { record: newRecord, total: calc.total, wasUpdated: Boolean(existingOrder) };
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
      setCompletedOrder(res.record);
      setText('');
      setItems([]);
      setTitle('');
      setCustomerName('');
      setCustomerPhone('');
      setWorkerName(shopSettingsRef.current.ownerName || 'Nguyễn Thị Ngọc');
      setCategory('alteration');
      setStatus('pending');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setHasSaved(false);
      setEditingOrderId(null);
      setActiveScreen('dashboard');
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
    // Công đoạn đã được lưu ở bảng kê; không nạp lại văn bản gốc vào vùng nhập.
    setText('');
    setItems(order.items);
    setHasSaved(true);
    setEditingOrderId(order.id);
    setCompletedOrder(null);
    setIsHistoryOpen(false);
    setActiveScreen('entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đã mở lại đơn ngày ${order.date}: "${order.title}"`);
  };

  // Delete an order from history with trash bin & auto-snapshot protection
  const handleDeleteOrder = (id: string) => {
    if (!window.confirm('Xóa đơn này? Đơn sẽ được đưa vào vùng khôi phục an toàn.')) return;
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
    if (editingOrderId === id) setEditingOrderId(null);
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
    queuePrivateBackup(savedOrders, newSettings);
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
      {activeScreen === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1 w-full space-y-5 sm:space-y-6">
          <DashboardStats
            orders={savedOrders}
            onCreateOrder={openOrderEntry}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenStatistics={() => document.getElementById('home-statistics')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />

          <StatisticsModal
            isOpen
            embedded
            onClose={() => undefined}
            orders={savedOrders}
            shopSettings={shopSettings}
            onToggleOrderStatus={handleToggleOrderStatus}
            onEditOrder={handleLoadOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        </main>
      )}

      {activeScreen === 'dashboard' && !isBlockingOverlayOpen && (
        isQuickAddVisible ? (
          <div
            className="fixed right-3 z-50 flex items-center gap-1.5"
            style={{
              transform: `translate3d(${quickAddOffset.x}px, ${quickAddOffset.y}px, 0)`,
              bottom: 'calc(1rem + env(safe-area-inset-bottom))',
            }}
          >
            <button
              type="button"
              onPointerDown={handleQuickAddDragStart}
              onPointerMove={handleQuickAddDragMove}
              onPointerUp={handleQuickAddDragEnd}
              onPointerCancel={handleQuickAddDragEnd}
              onClick={(event) => event.stopPropagation()}
              className="flex h-9 w-6 touch-none cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing"
              title="Giữ và kéo để di chuyển nút"
              aria-label="Giữ và kéo để di chuyển nút"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button
              id="btn-create-order"
              type="button"
              onClick={handleQuickAddClick}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 text-sm font-extrabold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-700 hover:to-cyan-700 active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Thêm phiếu mới
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); setIsQuickAddVisible(false); }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
              title="Ẩn nút thêm phiếu mới"
              aria-label="Ẩn nút thêm phiếu mới"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsQuickAddVisible(true)}
            className="fixed right-3 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-700 hover:to-cyan-700" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            title="Hiện nút thêm phiếu mới"
            aria-label="Hiện nút thêm phiếu mới"
          >
            <Eye className="h-4 w-4" />
          </button>
        )
      )}

      {/* Modals */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={completedOrder?.title || title}
        items={completedOrder?.items || items}
        shopSettings={shopSettings}
        customerName={completedOrder?.customerName || customerName}
        workerName={completedOrder?.workerName || workerName}
        orderDate={completedOrder?.date || orderDate}
      />

      {activeScreen === 'entry' && (
        <main className="max-w-7xl mx-auto w-full flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="space-y-5 sm:space-y-6">
            <section className="flex items-center">
              <button type="button" onClick={closeOrderEntry} className="inline-flex items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-bold text-slate-600 transition hover:text-blue-700">
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại trang chủ
              </button>
            </section>

            {!completedOrder && (
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
            )}

            <div className="w-full">
              <ItemsTable
                key={completedOrder ? 'completed' : 'draft'}
                items={items}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
                onDuplicateItem={handleDuplicateItem}
              />
            </div>

            {!completedOrder && (
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
            )}

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
          </div>
        </main>
      )}
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
        onSave={handleSaveSettings}
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
