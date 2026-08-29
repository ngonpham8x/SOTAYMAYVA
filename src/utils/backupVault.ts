import { OrderRecord, ShopSettings } from '../types';

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  reason: string;
  orderCount: number;
  totalRevenue: number;
  orders: OrderRecord[];
  shopSettings?: ShopSettings;
}

export interface TrashItem {
  id: string;
  deletedAt: number;
  deletedDateStr: string;
  order: OrderRecord;
}

const VAULT_STORAGE_KEY = 'sewing_hidden_backup_vault_v1';
const TRASH_STORAGE_KEY = 'sewing_trash_bin_vault_v1';
const LAST_EMAIL_BACKUP_KEY = 'sewing_last_daily_backup_date';
let remoteBackupTimer: number | undefined;

/**
 * Gets all saved snapshots from hidden local vault
 */
export function getSnapshotList(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load backup vault:', err);
    return [];
  }
}

/**
 * Creates an automatic snapshot point in hidden vault
 */
export function createSnapshot(
  orders: OrderRecord[],
  settings?: ShopSettings,
  reason: string = 'Tự động sao lưu'
): BackupSnapshot {
  const snapshots = getSnapshotList();
  const now = new Date();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  const newSnapshot: BackupSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    dateStr: now.toLocaleDateString('vi-VN'),
    timeStr: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    reason,
    orderCount: orders.length,
    totalRevenue,
    orders: JSON.parse(JSON.stringify(orders)),
    shopSettings: settings ? JSON.parse(JSON.stringify(settings)) : undefined,
  };

  // Keep up to 30 most recent snapshots
  const updated = [newSnapshot, ...snapshots.slice(0, 29)];
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage limit reached, trimming snapshots:', e);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated.slice(0, 10)));
  }

  return newSnapshot;
}

/**
 * Saves a deleted order into the trash bin for instant 1-click recovery
 */
export function addToTrash(order: OrderRecord): void {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    const list: TrashItem[] = raw ? JSON.parse(raw) : [];
    const now = new Date();
    const item: TrashItem = {
      id: `trash-${Date.now()}`,
      deletedAt: Date.now(),
      deletedDateStr: `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`,
      order: JSON.parse(JSON.stringify(order)),
    };
    // Keep max 50 trash items
    const updated = [item, ...list.slice(0, 49)];
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to trash bin:', e);
  }
}

/**
 * Gets list of deleted orders in trash bin
 */
export function getTrashBin(): TrashItem[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Removes an item from trash bin after restoring or permanent delete
 */
export function removeFromTrash(trashId: string): void {
  try {
    const list = getTrashBin().filter((t) => t.id !== trashId);
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Clears the trash bin completely
 */
export function emptyTrashBin(): void {
  localStorage.removeItem(TRASH_STORAGE_KEY);
}

/**
 * Downloads a complete portable JSON backup file
 */
export function downloadJsonBackup(orders: OrderRecord[], settings?: ShopSettings): void {
  const payload = {
    appName: 'Sổ May & Sửa Đồ Thông Minh',
    exportDate: new Date().toISOString(),
    formattedDate: new Date().toLocaleString('vi-VN'),
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0),
    shopSettings: settings,
    orders,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `SaoLuu_SoMay_${d}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded backup file
 */
export async function parseBackupFile(file: File): Promise<{ orders: OrderRecord[]; settings?: ShopSettings }> {
  if (file.size === 0) {
    throw new Error('Tệp sao lưu đang trống. Hãy chọn lại tệp .json đã tải từ ứng dụng.');
  }

  let data: unknown;
  try {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    data = JSON.parse(text);
  } catch {
    throw new Error('Không thể đọc tệp sao lưu. Hãy chọn đúng tệp .json hợp lệ.');
  }

  const payload = data && typeof data === 'object' && !Array.isArray(data)
    ? data as { orders?: unknown; shopSettings?: ShopSettings }
    : undefined;
  const rawOrders = Array.isArray(data) ? data : payload?.orders;
  if (!Array.isArray(rawOrders)) {
    throw new Error('Tệp không có danh sách đơn hàng để khôi phục. Hãy chọn bản sao lưu .json của Sổ May Thông Minh.');
  }
  if (!rawOrders.every((order) => order && typeof order === 'object' && !Array.isArray(order))) {
    throw new Error('Tệp sao lưu chứa dữ liệu đơn hàng không hợp lệ. Dữ liệu hiện tại chưa bị thay đổi.');
  }

  const now = Date.now();
  const fallbackDate = new Date().toISOString().split('T')[0];
  const numericValue = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const orders = rawOrders.map((rawOrder, index) => {
    const order = rawOrder as Partial<OrderRecord>;
    return {
      ...order,
      id: typeof order.id === 'string' && order.id.trim() ? order.id : `restored-order-${now}-${index}`,
      title: typeof order.title === 'string' && order.title.trim() ? order.title : `Đơn khôi phục ${index + 1}`,
      workerName: typeof order.workerName === 'string' ? order.workerName : '',
      customerName: typeof order.customerName === 'string' ? order.customerName : '',
      date: typeof order.date === 'string' && order.date ? order.date : fallbackDate,
      rawText: typeof order.rawText === 'string' ? order.rawText : '',
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: numericValue(order.subtotal),
      advanceAmount: numericValue(order.advanceAmount),
      discountAmount: numericValue(order.discountAmount),
      finalAmount: numericValue(order.finalAmount),
      status: order.status === 'completed' || order.status === 'paid' ? order.status : 'pending',
      createdAt: numericValue(order.createdAt) || now,
      updatedAt: numericValue(order.updatedAt) || now,
    } as OrderRecord;
  });

  return { orders, settings: payload?.shopSettings };
}

/**
 * Saves the newest recovery copy to the server's private store. The address
 * that receives scheduled recovery emails remains server-side and is never
 * sent to or rendered by the browser.
 */
export interface PrivateBackupSnapshot {
  timestamp: number;
  orders: OrderRecord[];
  shopSettings?: ShopSettings;
}

export type PrivateBackupFetchResult =
  | { state: 'available'; snapshot: PrivateBackupSnapshot }
  | { state: 'missing' }
  | { state: 'unavailable' };

export async function fetchPrivateBackup(): Promise<PrivateBackupFetchResult> {
  try {
    const response = await fetch('/api/backup/snapshot', { cache: 'no-store' });
    if (response.status === 404) return { state: 'missing' };
    if (!response.ok) return { state: 'unavailable' };
    const payload = await response.json();
    if (!Array.isArray(payload?.orders) || !Number.isFinite(Number(payload?.timestamp))) {
      return { state: 'unavailable' };
    }
    return {
      state: 'available',
      snapshot: {
        timestamp: Number(payload.timestamp),
        orders: payload.orders as OrderRecord[],
        shopSettings: payload.shopSettings as ShopSettings | undefined,
      },
    };
  } catch (error) {
    console.warn('Private backup fetch failed:', error);
    return { state: 'unavailable' };
  }
}

export async function syncPrivateBackup(
  orders: OrderRecord[],
  settings?: ShopSettings
): Promise<boolean> {
  try {
    const response = await fetch('/api/backup/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, shopSettings: settings }),
    });
    return response.ok;
  } catch (error) {
    console.warn('Private backup sync failed:', error);
    return false;
  }
}

/** Debounces background syncs while the owner edits several fields quickly. */
export function queuePrivateBackup(orders: OrderRecord[], settings?: ShopSettings): void {
  if (remoteBackupTimer !== undefined) {
    window.clearTimeout(remoteBackupTimer);
  }
  remoteBackupTimer = window.setTimeout(() => {
    remoteBackupTimer = undefined;
    void syncPrivateBackup(orders, settings);
  }, 1_000);
}

/**
 * Sends backup payload to server-side email endpoint
 * (The recipient address is stored securely server-side and hidden from the UI.)
 */
export async function triggerDailyEmailBackup(
  orders: OrderRecord[],
  settings?: ShopSettings,
  isManual: boolean = false
): Promise<{ success: boolean; message: string; simulated?: boolean }> {
  try {
    const response = await fetch('/api/backup/email-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders,
        shopSettings: settings,
        isManual,
        date: new Date().toLocaleDateString('vi-VN'),
        timestamp: Date.now(),
      }),
    });

    const result = await response.json();
    if (response.ok && result.success) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(LAST_EMAIL_BACKUP_KEY, todayStr);
      return { success: true, message: result.message || 'Đã lưu bản sao lưu khôi phục riêng tư thành công!' };
    } else {
      return { success: false, message: result.error || 'Không thể gửi email lúc này.' };
    }
  } catch (err: any) {
    console.warn('Email backup trigger notice:', err);
    return {
      success: false,
      message: 'Không thể kết nối máy chủ sao lưu lúc này. Dữ liệu vẫn còn trong kho khôi phục trên thiết bị.',
    };
  }
}

/**
 * Automatically checks and runs daily backup once per day in background
 */
export function checkAndRunDailyAutoBackup(orders: OrderRecord[], settings?: ShopSettings): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(LAST_EMAIL_BACKUP_KEY);

    // If not yet backed up today and there are orders, create snapshot & trigger email backup
    if (lastDate !== todayStr && orders.length > 0) {
      createSnapshot(orders, settings, `Tự động sao lưu ngày ${new Date().toLocaleDateString('vi-VN')}`);
      void triggerDailyEmailBackup(orders, settings, false);
    }
  } catch (e) {
    console.error('Auto daily backup background error:', e);
  }
}
