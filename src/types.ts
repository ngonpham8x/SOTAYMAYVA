export type ItemType = 'work' | 'material' | 'advance' | 'discount' | 'bonus';
export type OrderCategory = 'alteration' | 'sewing' | 'rental' | 'general';

export interface ParsedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  type: ItemType;
  note?: string;
}

export interface CalculationResult {
  items: ParsedItem[];
  subtotal: number;
  advances: number;
  discounts: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
}

export interface OrderRecord {
  id: string;
  title: string;
  workerName: string;
  customerName: string;
  customerPhone?: string;
  date: string; // YYYY-MM-DD
  rawText: string;
  items: ParsedItem[];
  subtotal: number;
  advanceAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'pending' | 'completed' | 'paid';
  category?: OrderCategory;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  defaultWorker: string;
  defaultCustomer: string;
  noteFooter: string;
  // VietQR Banking Transfer info
  bankName: string;
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
  bankBranch?: string;
  showQrOnReceipt: boolean;
}

export type StatsTimeframe = 'day' | 'week' | 'month' | 'year' | 'all';
