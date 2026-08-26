import QRCode from 'qrcode';
import { ParsedItem, ShopSettings } from '../types';
import { formatVND, numberToVietnameseWords, calculateTotals } from './textParser';
import { removeVietnameseTones, buildVietQrEmvCoPayload, OFFICIAL_EXIMBANK_EMVCO } from './vietQrHelper';

/**
 * Generates a clean, high-resolution invoice/receipt image on an HTML5 canvas
 */
export function generateReceiptCanvas(
  title: string,
  items: ParsedItem[],
  settings: ShopSettings,
  customerName?: string,
  workerName?: string,
  orderDate?: string
): HTMLCanvasElement {
  const calc = calculateTotals(items);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const showQr = settings.showQrOnReceipt !== false;
  const qrSectionHeight = showQr ? 175 : 0;

  // High-DPI 2x scale for crisp rendering
  const width = 800;
  const rowHeight = 36;
  const headerHeight = 220;
  const tableHeight = Math.max(1, items.length) * rowHeight + 40;
  const summaryHeight = 95;
  const signaturesHeight = 145;
  const height = headerHeight + tableHeight + summaryHeight + qrSectionHeight + signaturesHeight;

  canvas.width = width * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Decorative top bar
  ctx.fillStyle = '#2563EB'; // Blue 600
  ctx.fillRect(0, 0, width, 6);

  // Header Title
  ctx.fillStyle = '#0F172A'; // Slate 900
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(settings.shopName || 'TIỆM MAY & SỬA ĐỒ NGUYỄN THỊ NGỌC', width / 2, 42);

  ctx.fillStyle = '#64748B'; // Slate 500
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const ownerPhone = settings.phone || '0339.272.127';
  const shopAddress = settings.address || 'TP. Hồ Chí Minh';
  ctx.fillText(`${shopAddress ? 'Đ/C: ' + shopAddress : ''} | Hotline/Zalo: ${ownerPhone}`, width / 2, 62);

  // Invoice Title
  ctx.fillStyle = '#1E293B'; // Slate 800
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('PHIẾU TÍNH TIỀN CÔNG MAY & SỬA ĐỒ', width / 2, 98);

  // Meta Info Box
  ctx.fillStyle = '#F8FAFC'; // Slate 50
  ctx.strokeStyle = '#E2E8F0'; // Slate 200
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(30, 115, width - 60, 75, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#334155'; // Slate 700

  const dateStr = orderDate || new Date().toLocaleDateString('vi-VN');
  ctx.fillText(`Mẫu/Đơn: ${title || 'Chi tiết công may & sửa đồ'}`, 45, 140);
  ctx.fillText(`Khách hàng: ${customerName || 'Khách lẻ'}`, 45, 165);

  ctx.textAlign = 'right';
  ctx.fillText(`Ngày lập: ${dateStr}`, width - 45, 140);
  ctx.fillText(`Thợ phụ trách: ${workerName || settings.ownerName || 'Nguyễn Thị Ngọc'}`, width - 45, 165);

  // Table Setup
  const tableTop = 205;
  const tableLeft = 30;
  const tableWidth = width - 60;

  // Table Header
  ctx.fillStyle = '#F1F5F9'; // Slate 100
  ctx.fillRect(tableLeft, tableTop, tableWidth, 34);
  ctx.strokeStyle = '#CBD5E1'; // Slate 300
  ctx.strokeRect(tableLeft, tableTop, tableWidth, 34);

  ctx.fillStyle = '#0F172A'; // Slate 900
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STT', tableLeft + 25, tableTop + 22);

  ctx.textAlign = 'left';
  ctx.fillText('Tên công đoạn / Chi phí sửa', tableLeft + 65, tableTop + 22);

  ctx.textAlign = 'center';
  ctx.fillText('SL', tableLeft + 390, tableTop + 22);
  ctx.fillText('ĐVT', tableLeft + 440, tableTop + 22);

  ctx.textAlign = 'right';
  ctx.fillText('Đơn giá', tableLeft + 560, tableTop + 22);
  ctx.fillText('Thành tiền', tableLeft + tableWidth - 15, tableTop + 22);

  // Table Rows
  let currentY = tableTop + 34;
  items.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 1) {
      ctx.fillStyle = '#F8FAFC'; // Slate 50
      ctx.fillRect(tableLeft, currentY, tableWidth, rowHeight);
    }
    ctx.strokeStyle = '#E2E8F0'; // Slate 200
    ctx.strokeRect(tableLeft, currentY, tableWidth, rowHeight);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B'; // Slate 500
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${index + 1}`, tableLeft + 25, currentY + 23);

    // Name
    ctx.textAlign = 'left';
    ctx.fillStyle = item.type === 'advance' ? '#DC2626' : item.type === 'discount' ? '#2563EB' : '#0F172A';
    ctx.font = '500 13px system-ui, -apple-system, sans-serif';
    const tag = item.type === 'advance' ? '[ĐÃ ỨNG] ' : item.type === 'discount' ? '[GIẢM GIÁ] ' : '';
    ctx.fillText(`${tag}${item.name}`, tableLeft + 65, currentY + 23);

    // Qty & Unit
    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155'; // Slate 700
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${item.quantity}`, tableLeft + 390, currentY + 23);
    ctx.fillText(item.unit || 'công', tableLeft + 440, currentY + 23);

    // Unit Price
    ctx.textAlign = 'right';
    ctx.fillText(formatVND(item.unitPrice), tableLeft + 560, currentY + 23);

    // Amount
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = item.type === 'advance' ? '#DC2626' : '#2563EB'; // Blue for amount
    const amountStr = item.type === 'advance' ? `-${formatVND(item.amount)}` : formatVND(item.amount);
    ctx.fillText(amountStr, tableLeft + tableWidth - 15, currentY + 23);

    currentY += rowHeight;
  });

  // Summary section
  const summaryTop = currentY + 15;
  ctx.fillStyle = '#F8FAFC'; // Slate 50
  ctx.strokeStyle = '#CBD5E1'; // Slate 300
  ctx.beginPath();
  ctx.roundRect(tableLeft, summaryTop, tableWidth, 80, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B'; // Slate 800
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Tổng số công đoạn: ${calc.itemCount} việc (${calc.totalQuantity} sản phẩm)`, tableLeft + 20, summaryTop + 28);
  ctx.fillText(`Số tiền bằng chữ: ${numberToVietnameseWords(calc.total)}`, tableLeft + 20, summaryTop + 54);

  ctx.textAlign = 'right';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('TỔNG CỘNG:', tableLeft + tableWidth - 180, summaryTop + 45);

  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#2563EB'; // Blue 600
  ctx.fillText(formatVND(calc.total), tableLeft + tableWidth - 20, summaryTop + 45);

  currentY = summaryTop + 80;

  // --- VIETQR PAYMENT SECTION ---
  if (showQr) {
    const qrTop = currentY + 15;
    const qrBoxHeight = 160;

    // Card background
    ctx.fillStyle = '#F8FAFC'; // Slate 50
    ctx.strokeStyle = '#CBD5E1'; // Slate 300
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tableLeft, qrTop, tableWidth, qrBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    const bankAccount = settings.bankAccount || '100192186';
    const bankAccountName = settings.bankAccountName || 'NGUYEN THI NGOC';
    const bankName = settings.bankName || 'Eximbank';
    const bankBranch = settings.bankBranch || 'Eximbank Bảo Lộc';
    const transferMemo = `Sua do Ngoc ${removeVietnameseTones(customerName || title || 'Khach').substring(0, 20)}`;

    // Build standard Napas 247 EMVCo payload for 100% bank scanning accuracy
    // When using Eximbank 100192186, always use the exact official static QR from bank image to ensure 100% scanning success
    let emvCoPayload: string;
    if (bankAccount === '100192186' || !settings.bankAccount || settings.bankAccount === '100192186') {
      emvCoPayload = OFFICIAL_EXIMBANK_EMVCO;
    } else {
      emvCoPayload = buildVietQrEmvCoPayload({
        bankBin: settings.bankBin || '970431',
        accountNo: bankAccount,
        accountName: bankAccountName,
        amount: undefined, // Static QR avoids bank parser rejection
        description: transferMemo,
      });
    }

    // Draw QR Code synchronously via qrcode matrix
    try {
      const qrObj = QRCode.create(emvCoPayload, { errorCorrectionLevel: 'M' });
      const qrSize = qrObj.modules.size;
      const targetQrPx = 132;
      const cellSize = Math.floor(targetQrPx / qrSize);
      const actualQrPx = cellSize * qrSize;
      const qrX = tableLeft + 18 + Math.floor((targetQrPx - actualQrPx) / 2);
      const qrY = qrTop + 14 + Math.floor((targetQrPx - actualQrPx) / 2);

      // QR White border wrapper (Quiet zone)
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tableLeft + 12, qrTop + 8, targetQrPx + 12, targetQrPx + 12, 8);
      ctx.fill();
      ctx.stroke();

      // Render QR modules with crisp high contrast integer pixel alignment
      ctx.fillStyle = '#000000';
      for (let r = 0; r < qrSize; r++) {
        for (let c = 0; c < qrSize; c++) {
          if (qrObj.modules.get(r, c)) {
            ctx.fillRect(
              qrX + c * cellSize,
              qrY + r * cellSize,
              cellSize,
              cellSize
            );
          }
        }
      }
    } catch (e) {
      console.warn('Canvas QR render error:', e);
    }

    // Right details next to QR
    const textLeft = tableLeft + 175;
    ctx.textAlign = 'left';

    // Header badge
    ctx.fillStyle = '#005CA9'; // VietQR Blue
    ctx.font = 'bold 13.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('MÃ QR CHUYỂN KHOẢN CHUẨN VIETQR (NAPAS 24/7)', textLeft, qrTop + 28);

    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';

    ctx.fillText('Ngân hàng:', textLeft, qrTop + 54);
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${bankName} - ${bankBranch}`, textLeft + 85, qrTop + 54);

    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Chủ tài khoản:', textLeft, qrTop + 78);
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(bankAccountName, textLeft + 105, qrTop + 78);

    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Số tài khoản:', textLeft, qrTop + 102);
    ctx.font = 'bold 16px monospace, system-ui';
    ctx.fillStyle = '#047857'; // Emerald 700
    ctx.fillText(bankAccount, textLeft + 105, qrTop + 102);

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Nội dung: ${transferMemo}`, textLeft, qrTop + 128);

    // Amount badge
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#2563EB';
    ctx.fillText(`Số tiền: ${formatVND(calc.total)}`, tableLeft + tableWidth - 15, qrTop + 128);

    currentY = qrTop + qrBoxHeight;
  }

  // Signatures
  const sigTop = currentY + 30;
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NGƯỜI LẬP PHIẾU', width * 0.25, sigTop);
  ctx.fillText('NGƯỜI NHẬN / THỢ', width * 0.75, sigTop);

  ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('(Ký và ghi rõ họ tên)', width * 0.25, sigTop + 18);
  ctx.fillText('(Ký và ghi rõ họ tên)', width * 0.75, sigTop + 18);

  // Note footer
  if (settings.noteFooter) {
    ctx.textAlign = 'center';
    ctx.font = 'italic 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(settings.noteFooter, width / 2, height - 15);
  }

  return canvas;
}

/**
 * Download generated receipt as PNG file
 */
export function downloadReceiptImage(
  title: string,
  items: ParsedItem[],
  settings: ShopSettings,
  customerName?: string,
  workerName?: string,
  orderDate?: string
) {
  const canvas = generateReceiptCanvas(title, items, settings, customerName, workerName, orderDate);
  const link = document.createElement('a');
  const cleanName = (customerName || title || 'ChiTiet').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const filename = `Phieu_Cong_May_${cleanName}_${Date.now()}.png`;
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Exports data to CSV file
 */
export function exportToCSV(
  title: string,
  items: ParsedItem[],
  customerName?: string,
  workerName?: string,
  orderDate?: string
) {
  const calc = calculateTotals(items);
  const rows = [
    ['BẢNG TÍNH TIỀN CÔNG MAY & SỬA ĐỒ'],
    ['Mẫu / Đơn hàng', title || 'Chi tiết'],
    ['Khách hàng', customerName || 'Khách lẻ'],
    ['Thợ may', workerName || 'Nguyễn Thị Ngọc'],
    ['Ngày lập', orderDate || new Date().toLocaleDateString('vi-VN')],
    [],
    ['STT', 'Tên công đoạn / Hạng mục', 'Số lượng', 'Đơn vị', 'Đơn giá (VNĐ)', 'Thành tiền (VNĐ)', 'Loại'],
  ];

  items.forEach((item, i) => {
    rows.push([
      (i + 1).toString(),
      `"${item.name.replace(/"/g, '""')}"`,
      item.quantity.toString(),
      item.unit || 'công',
      item.unitPrice.toString(),
      item.amount.toString(),
      item.type,
    ]);
  });

  rows.push([]);
  rows.push(['', '', '', '', 'TỔNG CỘNG', calc.total.toString(), '']);
  rows.push(['Bằng chữ', `"${numberToVietnameseWords(calc.total)}"`]);

  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Bang_Tinh_Tien_${Date.now()}.csv`;
  link.click();
}
