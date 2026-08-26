import { ParsedItem, CalculationResult, ItemType } from '../types';

/**
 * Parses Vietnamese currency strings into integer amounts (in VND)
 * Examples:
 * - "200k" -> 200000
 * - "120.000" -> 120000
 * - "1.5tr", "1tr5", "1 triệu 500" -> 1500000
 * - "50000đ", "50k", "50 ngàn", "50 nghìn" -> 50000
 */
export function parseCurrencyAmount(rawStr: string): number {
  if (!rawStr) return 0;
  let str = rawStr.toLowerCase().trim();

  // Clean trailing punctuation
  str = str.replace(/[;,.!?:]+$/, '');

  // Case: "1tr5" -> 1.5 million
  const trRegex = /^(\d+)[tr|triệu](\d+)?$/i;
  const trMatch = str.match(trRegex);
  if (trMatch) {
    const million = parseInt(trMatch[1], 10);
    const sub = trMatch[2] ? parseInt(trMatch[2].padEnd(6, '0').slice(0, 6), 10) : 0;
    return million * 1_000_000 + (trMatch[2] ? parseInt(trMatch[2], 10) * Math.pow(10, 6 - trMatch[2].length) : 0);
  }

  // Check for million ("tr", "triệu")
  if (str.includes('tr') || str.includes('triệu')) {
    const numPart = str.replace(/[^0-9.,]/g, '').replace(',', '.');
    const val = parseFloat(numPart);
    if (!isNaN(val)) return Math.round(val * 1_000_000);
  }

  // Check for thousand ("k", "nghìn", "ngàn", "ng")
  if (str.includes('k') || str.includes('nghìn') || str.includes('ngàn') || str.includes('ng')) {
    const numPart = str.replace(/[^0-9.,]/g, '').replace(',', '.');
    const val = parseFloat(numPart);
    if (!isNaN(val)) return Math.round(val * 1_000);
  }

  // Standard numeric formatted like "200.000" or "200,000" or "200000"
  const cleaned = str.replace(/[^0-9]/g, '');
  if (cleaned) {
    const val = parseInt(cleaned, 10);
    // If user types small number like "200" or "120" without unit, usually in tailoring context it means "200k"
    // But if >= 1000 it's direct VND
    if (val < 1000 && val > 0) {
      return val * 1000;
    }
    return isNaN(val) ? 0 : val;
  }

  return 0;
}

/**
 * Intelligent Vietnamese Piecework & Tailoring Parser
 * Automatically splits Vietnamese tailoring and alteration text into work items and prices.
 */
export function parseSewingText(input: string): ParsedItem[] {
  if (!input || !input.trim()) return [];

  const items: ParsedItem[] = [];
  const text = input.trim();

  // Pattern matching monetary endings in Vietnamese text:
  // e.g. "200k", "120.000đ", "100k", "1.5tr", "50 nghìn", "50ng", "35.000 vnđ", "150.000"
  const pricePattern = /(?:[-+]?\s*)?(?:\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|ng|tr|triệu|đ|vnd|vnđ)|\b\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|vnd|vnđ))?|\b\d{2,3}k\b|\b\d{5,9}\b)/gi;

  const matches: { start: number; end: number; rawPrice: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = pricePattern.exec(text)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      rawPrice: m[0].trim(),
    });
  }

  if (matches.length > 0) {
    let lastEnd = 0;

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      // The description is everything from previous match end to this match start
      let segment = text.slice(lastEnd, currentMatch.start).trim();
      let rawPrice = currentMatch.rawPrice;

      // Clean leading/trailing punctuation like commas, dots, dashes, colons, pluses, semicolons
      segment = segment.replace(/^[\s,;.:\-+/*=]+|[\s,;.:\-+/*=]+$/g, '').trim();

      // Check if price had negative sign attached or segment indicates advance/discount
      const isNegative = rawPrice.startsWith('-') || /^(ứng|tạm ứng|cọc|đã cọc|trừ|giảm|bớt)/i.test(segment);
      const isAdvance = /^(ứng|tạm ứng|cọc|đã cọc|đặt cọc|ứng trước)/i.test(segment);
      const isDiscount = /^(giảm|bớt|chiết khấu|khuyến mãi)/i.test(segment);
      const isMaterial = /(thun|chỉ|dây kéo|khoá|nút|keo|mếch|ren|phụ liệu)/i.test(segment) && !/(may|ráp|nối|vắt sổ|ủi|cắt)/i.test(segment);

      let itemType: ItemType = 'work';
      if (isAdvance) itemType = 'advance';
      else if (isDiscount) itemType = 'discount';
      else if (isMaterial) itemType = 'material';

      // Parse quantity and unit if specified, e.g. "5 áo x 40k", "10m nối dây viền 5k", "3 cái may lai"
      let quantity = 1;
      let unit = 'công';
      let cleanName = segment;

      // Check pattern: "10 x [Tên việc]" or "[Tên việc] 10 x" or "5 cái [Tên việc]"
      const qtyPattern1 = /^(\d+)\s*(cái|áo|quần|bộ|mét|m|con|lần|cặp)?\s*[x*]\s*(.*)$/i;
      const qtyPattern2 = /^(.*?)\s+(\d+)\s*(cái|áo|quần|bộ|mét|m|con|lần|cặp)?\s*[x*]\s*$/i;
      const qtyPattern3 = /^(\d+)\s+(cái|áo|quần|bộ|mét|m|con|lần|cặp|đôi)\s+(.*)$/i;

      let qm: RegExpMatchArray | null;
      if ((qm = segment.match(qtyPattern1))) {
        quantity = parseInt(qm[1], 10) || 1;
        if (qm[2]) unit = qm[2];
        cleanName = qm[3].trim();
      } else if ((qm = segment.match(qtyPattern2))) {
        cleanName = qm[1].trim();
        quantity = parseInt(qm[2], 10) || 1;
        if (qm[3]) unit = qm[3];
      } else if ((qm = segment.match(qtyPattern3))) {
        quantity = parseInt(qm[1], 10) || 1;
        unit = qm[2];
        cleanName = qm[3].trim();
      }

      // Default name fallback if empty
      if (!cleanName) {
        cleanName = `Công đoạn ${i + 1}`;
      }

      // Capitalize first letter of name
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

      const parsedPrice = parseCurrencyAmount(rawPrice);
      const unitPrice = parsedPrice;
      const amount = quantity * unitPrice * (isNegative && itemType === 'work' ? -1 : 1);

      items.push({
        id: `item-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        quantity,
        unit,
        unitPrice,
        amount,
        type: itemType,
      });

      lastEnd = currentMatch.end;
    }
  } else {
    // If no explicit price matches found, try line-by-line simple parse
    const lines = text.split(/\r?\n|;/).filter((l) => l.trim().length > 0);
    lines.forEach((line, idx) => {
      items.push({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: line.trim(),
        quantity: 1,
        unit: 'công',
        unitPrice: 0,
        amount: 0,
        type: 'work',
      });
    });
  }

  return items;
}

/**
 * Calculates subtotals, advances, discounts and total
 */
export function calculateTotals(items: ParsedItem[]): CalculationResult {
  let subtotal = 0;
  let advances = 0;
  let discounts = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const itemAmount = Math.abs(item.quantity * item.unitPrice);

    if (item.type === 'advance') {
      advances += itemAmount;
    } else if (item.type === 'discount') {
      discounts += itemAmount;
    } else {
      subtotal += itemAmount;
      totalQuantity += item.quantity;
    }
  }

  const total = Math.max(0, subtotal - advances - discounts);

  return {
    items,
    subtotal,
    advances,
    discounts,
    total,
    itemCount: items.length,
    totalQuantity,
  };
}

/**
 * Formats a number to Vietnamese Dong currency format (e.g. 540.000 ₫)
 */
export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

/**
 * Formats a number to short Vietnamese notation (e.g. 540k, 1.2tr)
 */
export function formatVNDShort(amount: number): string {
  if (isNaN(amount) || amount === 0) return '0k';
  if (Math.abs(amount) >= 1_000_000) {
    const mil = amount / 1_000_000;
    return `${parseFloat(mil.toFixed(2))}tr`;
  }
  const k = amount / 1000;
  return `${parseFloat(k.toFixed(1))}k`;
}

/**
 * Converts numbers to written Vietnamese words
 * e.g. 540000 -> "Năm trăm bốn mươi nghìn đồng chẵn"
 */
export function numberToVietnameseWords(n: number): string {
  if (isNaN(n) || n === 0) return 'Không đồng';

  const defaultNumbers = ' không một hai ba bốn năm sáu bảy tám chín';
  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

  const readThreeDigits = (threeDigits: string, full: boolean) => {
    let a = parseInt(threeDigits[0], 10);
    let b = parseInt(threeDigits[1], 10);
    let c = parseInt(threeDigits[2], 10);
    let result = '';

    if (a === 0 && b === 0 && c === 0) return '';

    if (full || a > 0) {
      result += defaultNumbers.substr(a * 2, 2) + ' trăm';
      if (b === 0 && c > 0) result += ' lẻ';
    }

    if (b > 0) {
      if (b === 1) result += ' mười';
      else result += defaultNumbers.substr(b * 2, 2) + ' mươi';
    }

    if (c > 0) {
      if (b > 0 && c === 1 && b !== 1) result += ' mốt';
      else if (b > 0 && c === 5) result += ' lăm';
      else result += defaultNumbers.substr(c * 2, 2);
    }

    return result;
  };

  const amountStr = Math.round(Math.abs(n)).toString();
  const len = amountStr.length;
  let result = '';
  let groupIndex = 0;

  for (let i = len; i > 0; i -= 3) {
    const start = Math.max(0, i - 3);
    let group = amountStr.slice(start, i);
    while (group.length < 3) group = '0' + group;

    const read = readThreeDigits(group, i < len);
    if (read) {
      result = read + units[groupIndex] + result;
    }
    groupIndex++;
  }

  result = result.trim();
  if (!result) return 'Không đồng';

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return `${result} đồng chẵn`;
}

/**
 * Formats a clean Zalo / SMS shareable message
 */
export function formatMessageForZalo(
  title: string,
  items: ParsedItem[],
  customerName?: string,
  workerName?: string,
  date?: string
): string {
  const calc = calculateTotals(items);
  const nowStr = date || new Date().toLocaleDateString('vi-VN');

  let text = `📋 BẢNG TÍNH TIỀN CÔNG MAY\n`;
  if (title) text += `🏷️ Mẫu/Đơn: ${title}\n`;
  if (customerName) text += `👤 Khách hàng: ${customerName}\n`;
  if (workerName) text += `🧵 Thợ may: ${workerName}\n`;
  text += `📅 Ngày: ${nowStr}\n`;
  text += `------------------------------\n`;

  items.forEach((item, idx) => {
    const qtyStr = item.quantity > 1 ? ` (${item.quantity} ${item.unit} x ${formatVNDShort(item.unitPrice)})` : '';
    const prefix = item.type === 'advance' ? '🔻 Đã ứng:' : item.type === 'discount' ? '🎁 Giảm:' : `${idx + 1}.`;
    text += `${prefix} ${item.name}: ${formatVND(item.amount)}${qtyStr}\n`;
  });

  text += `------------------------------\n`;
  if (calc.advances > 0 || calc.discounts > 0) {
    text += `🔹 Tổng tiền công: ${formatVND(calc.subtotal)}\n`;
    if (calc.advances > 0) text += `🔻 Đã tạm ứng: -${formatVND(calc.advances)}\n`;
    if (calc.discounts > 0) text += `🎁 Giảm giá: -${formatVND(calc.discounts)}\n`;
  }
  text += `👉 TỔNG CỘNG THANH TOÁN: ${formatVND(calc.total)}\n`;
  text += `✍️ (Bằng chữ: ${numberToVietnameseWords(calc.total)})\n`;
  text += `\nCảm ơn quý khách!`;

  return text;
}
