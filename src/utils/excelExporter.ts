import type ExcelJS from 'exceljs';
import { OrderRecord, ParsedItem, ShopSettings } from '../types';

export interface ExportOrderParams {
  title: string;
  items: ParsedItem[];
  workerName: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  subtotal: number;
  advanceAmount: number;
  discountAmount: number;
  finalAmount: number;
  status?: string;
  shopSettings?: ShopSettings;
}

/**
 * Downloads a workbook buffer directly in the browser
 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

function configureSinglePageReceiptPrint(worksheet: ExcelJS.Worksheet, lastRow: number) {
  // Excel's default scale takes precedence over Fit to Page, so it must be removed.
  delete worksheet.pageSetup.scale;
  Object.assign(worksheet.pageSetup, {
    paperSize: 9, // A4
    orientation: 'portrait' as const,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    verticalCentered: false,
    showGridLines: false,
    printArea: `A1:G${lastRow}`,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.3,
      bottom: 0.3,
      header: 0.1,
      footer: 0.1,
    },
  });
}

/**
 * Exports current active order / receipt items to a beautifully formatted Excel (.xlsx) file
 * No manual resizing or reformatting required by user when opening in Excel/WPS.
 */
export async function exportCurrentOrderToExcel(params: ExportOrderParams) {
  const ExcelJS = (await import('exceljs')).default;
  const {
    title,
    items,
    workerName,
    customerName,
    customerPhone,
    date,
    subtotal,
    advanceAmount,
    discountAmount,
    finalAmount,
    status = 'completed',
    shopSettings,
  } = params;

  const shopName = shopSettings?.shopName || 'TIỆM MAY & SỬA ĐỒ NGUYỄN THỊ NGỌC';
  const shopPhone = shopSettings?.phone || '0339.272.127';
  const shopAddress = shopSettings?.address || '24B/87 Đường số 21 Bời Lời, Kp Ninh Lộc';
  const bankInfo = `${shopSettings?.bankAccount || '100192186'} - ${shopSettings?.bankName || 'Eximbank (NGUYEN THI NGOC)'}`;
  const orderTitle = title || 'Phiếu may & sửa quần áo';
  const custName = customerName || 'Khách lẻ';
  const custPhone = customerPhone || '(Chưa cập nhật)';
  const worker = workerName || shopSettings?.ownerName || 'Nguyễn Thị Ngọc';
  const orderStatus = status === 'completed' || status === 'paid' ? 'Đã hoàn thành' : 'Đang sửa / Đang may';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Phieu_Tinh_Tien', {
    views: [{ showGridLines: true }],
  });

  // Set explicit column widths
  worksheet.columns = [
    { key: 'colA', width: 14 }, // STT / Labels
    { key: 'colB', width: 38 }, // Tên công đoạn / Chi tiết
    { key: 'colC', width: 12 }, // Số lượng
    { key: 'colD', width: 14 }, // ĐVT
    { key: 'colE', width: 22 }, // Đơn giá / Nhãn tổng cộng
    { key: 'colF', width: 22 }, // Thành tiền / Giá trị tổng
    { key: 'colG', width: 24 }, // Ghi chú / Phân loại
  ];

  // ================= 1. HEADER (CENTERED ROWS 1, 2, 3 & LEFT ROW 4) =================
  // Row 1: Tiêu đề phiếu -> CANH GIỮA (Center)
  worksheet.mergeCells('A1:G1');
  const cellA1 = worksheet.getCell('A1');
  cellA1.value = 'PHIẾU TÍNH TIỀN CÔNG MAY & SỬA QUẦN ÁO THUÊ';
  cellA1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // Row 2: Tên tiệm -> CANH GIỮA (Center)
  worksheet.mergeCells('A2:G2');
  const cellA2 = worksheet.getCell('A2');
  cellA2.value = shopName.toUpperCase();
  cellA2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // Row 3: Hotline & Địa chỉ -> CANH GIỮA (Center)
  worksheet.mergeCells('A3:G3');
  const cellA3 = worksheet.getCell('A3');
  cellA3.value = `Hotline: ${shopPhone}  •  Địa chỉ: ${shopAddress}`;
  cellA3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  cellA3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // Row 4: Tài khoản VietQR -> GIỮ NGUYÊN CANH TRÁI (Left-aligned)
  worksheet.mergeCells('A4:G4');
  const cellA4 = worksheet.getCell('A4');
  cellA4.value = `Tài khoản VietQR: ${bankInfo}`;
  cellA4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
  cellA4.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(4).height = 18;

  // Row 5: Empty separator
  worksheet.getRow(5).height = 8;

  // ================= 2. ORDER & CUSTOMER METADATA =================
  // Row 6: Section Header
  worksheet.mergeCells('A6:G6');
  const cellA6 = worksheet.getCell('A6');
  cellA6.value = 'THÔNG TIN ĐƠN HÀNG & KHÁCH HÀNG';
  cellA6.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
  cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  cellA6.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  worksheet.getRow(6).height = 22;

  // Row 7: Order Name & Date
  const r7 = worksheet.getRow(7);
  r7.height = 20;
  r7.getCell(1).value = 'Mã đơn / Mẫu:';
  r7.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('B7:C7');
  r7.getCell(2).value = orderTitle;
  r7.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  r7.getCell(4).value = 'Ngày lập:';
  r7.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('E7:G7');
  r7.getCell(5).value = date;
  r7.getCell(5).font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };

  // Row 8: Customer & Phone
  const r8 = worksheet.getRow(8);
  r8.height = 20;
  r8.getCell(1).value = 'Khách hàng:';
  r8.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('B8:C8');
  r8.getCell(2).value = custName;
  r8.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  r8.getCell(4).value = 'Số điện thoại:';
  r8.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('E8:G8');
  r8.getCell(5).value = custPhone;
  r8.getCell(5).font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };

  // Row 9: Worker & Status
  const r9 = worksheet.getRow(9);
  r9.height = 20;
  r9.getCell(1).value = 'Thợ phụ trách:';
  r9.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('B9:C9');
  r9.getCell(2).value = worker;
  r9.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
  r9.getCell(4).value = 'Trạng thái:';
  r9.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  worksheet.mergeCells('E9:G9');
  r9.getCell(5).value = orderStatus;
  r9.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF047857' } };

  // Row 10: Empty separator
  worksheet.getRow(10).height = 10;

  // ================= 3. ITEMS TABLE HEADER =================
  const headerRow = worksheet.getRow(11);
  headerRow.height = 24;
  const headers = [
    'STT',
    'Tên công đoạn / Chi tiết sửa',
    'Số lượng',
    'ĐVT',
    'Đơn giá (VNĐ)',
    'Thành tiền (VNĐ)',
    'Ghi chú / Phân loại',
  ];

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    cell.border = thinBorder;
    if (idx === 0 || idx === 2 || idx === 3) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (idx === 4 || idx === 5) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  });

  // ================= 4. ITEMS TABLE ROWS =================
  let currentRowIndex = 12;

  items.forEach((item, index) => {
    const row = worksheet.getRow(currentRowIndex);
    row.height = 22;

    let noteText = item.note || '';
    if (item.type === 'advance') noteText = 'Đã tạm ứng trước';
    else if (item.type === 'discount') noteText = 'Giảm giá / Ưu đãi';
    else if (item.type === 'material') noteText = 'Phụ liệu may';

    // Col 1: STT
    const c1 = row.getCell(1);
    c1.value = index + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.font = { name: 'Arial', size: 10 };
    c1.border = thinBorder;

    // Col 2: Name
    const c2 = row.getCell(2);
    c2.value = item.name;
    c2.alignment = { horizontal: 'left', vertical: 'middle' };
    c2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    c2.border = thinBorder;

    // Col 3: Qty
    const c3 = row.getCell(3);
    c3.value = item.quantity;
    c3.alignment = { horizontal: 'center', vertical: 'middle' };
    c3.font = { name: 'Arial', size: 10 };
    c3.border = thinBorder;

    // Col 4: Unit
    const c4 = row.getCell(4);
    c4.value = item.unit || 'công';
    c4.alignment = { horizontal: 'center', vertical: 'middle' };
    c4.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
    c4.border = thinBorder;

    // Col 5: Unit Price
    const c5 = row.getCell(5);
    c5.value = item.unitPrice;
    c5.numFmt = '#,##0';
    c5.alignment = { horizontal: 'right', vertical: 'middle' };
    c5.font = { name: 'Arial', size: 10 };
    c5.border = thinBorder;

    // Col 6: Amount
    const c6 = row.getCell(6);
    c6.value = item.amount;
    c6.numFmt = '#,##0';
    c6.alignment = { horizontal: 'right', vertical: 'middle' };
    c6.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    c6.border = thinBorder;

    // Col 7: Note
    const c7 = row.getCell(7);
    c7.value = noteText;
    c7.alignment = { horizontal: 'left', vertical: 'middle' };
    c7.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    c7.border = thinBorder;

    currentRowIndex++;
  });

  // ================= 5. SUMMARY ROWS =================
  // Row: Subtotal
  const subtotalRow = worksheet.getRow(currentRowIndex);
  subtotalRow.height = 22;
  worksheet.mergeCells(`A${currentRowIndex}:D${currentRowIndex}`);
  subtotalRow.getCell(5).value = 'Tổng tiền công gốc:';
  subtotalRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  subtotalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  subtotalRow.getCell(6).value = subtotal;
  subtotalRow.getCell(6).numFmt = '#,##0';
  subtotalRow.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  subtotalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  subtotalRow.getCell(7).value = 'VNĐ';
  subtotalRow.getCell(7).font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
  currentRowIndex++;

  if (advanceAmount > 0) {
    const advRow = worksheet.getRow(currentRowIndex);
    advRow.height = 20;
    advRow.getCell(5).value = 'Tạm ứng trước (trừ):';
    advRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE11D48' } };
    advRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    advRow.getCell(6).value = -advanceAmount;
    advRow.getCell(6).numFmt = '#,##0';
    advRow.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFE11D48' } };
    advRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    advRow.getCell(7).value = 'VNĐ';
    currentRowIndex++;
  }

  if (discountAmount > 0) {
    const discRow = worksheet.getRow(currentRowIndex);
    discRow.height = 20;
    discRow.getCell(5).value = 'Giảm giá ưu đãi (trừ):';
    discRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    discRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    discRow.getCell(6).value = -discountAmount;
    discRow.getCell(6).numFmt = '#,##0';
    discRow.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    discRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    discRow.getCell(7).value = 'VNĐ';
    currentRowIndex++;
  }

  // Row: Final Amount
  const totalRow = worksheet.getRow(currentRowIndex);
  totalRow.height = 26;
  totalRow.getCell(5).value = 'TỔNG CỘNG THANH TOÁN:';
  totalRow.getCell(5).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  totalRow.getCell(6).value = finalAmount;
  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.getCell(6).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFB45309' } };
  totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  totalRow.getCell(7).value = 'VNĐ';
  totalRow.getCell(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB45309' } };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  currentRowIndex += 2;

  // ================= 6. SIGNATURES =================
  const signTitleRow = worksheet.getRow(currentRowIndex);
  signTitleRow.height = 22;
  worksheet.mergeCells(`B${currentRowIndex}:C${currentRowIndex}`);
  signTitleRow.getCell(2).value = 'NGƯỜI LẬP PHIẾU';
  signTitleRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  signTitleRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`F${currentRowIndex}:G${currentRowIndex}`);
  signTitleRow.getCell(6).value = 'KHÁCH HÀNG / THỢ NHẬN';
  signTitleRow.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  signTitleRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  currentRowIndex++;

  const signSubRow = worksheet.getRow(currentRowIndex);
  signSubRow.height = 18;
  worksheet.mergeCells(`B${currentRowIndex}:C${currentRowIndex}`);
  signSubRow.getCell(2).value = '(Ký và ghi rõ họ tên)';
  signSubRow.getCell(2).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signSubRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`F${currentRowIndex}:G${currentRowIndex}`);
  signSubRow.getCell(6).value = '(Ký và ghi rõ họ tên)';
  signSubRow.getCell(6).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signSubRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

  configureSinglePageReceiptPrint(worksheet, currentRowIndex);

  const cleanName = (custName || orderTitle || 'Phieu_May').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const filename = `Phieu_${cleanName}_${date}.xlsx`;

  await downloadWorkbook(workbook, filename);
}

export interface ExportStatisticsParams {
  timeframeLabel: string;
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalGarments?: number;
    completedOrders?: number;
    pendingOrders?: number;
    totalAdvances?: number;
    totalDiscounts?: number;
    avgOrderValue?: number;
    workerMap?: Record<string, { count: number; total: number; garments: number }>;
    categoryMap?: Record<string, { count: number; total: number }>;
    dayMap?: Record<string, { count: number; total: number }>;
  };
  orders: OrderRecord[];
  shopSettings?: ShopSettings;
}

/**
 * Exports full statistics report and detailed list of orders to an Excel (.xlsx) workbook with 2 sheets
 */
export async function exportStatisticsToExcel(params: ExportStatisticsParams) {
  const ExcelJS = (await import('exceljs')).default;
  const { timeframeLabel, stats, orders, shopSettings } = params;

  const workbook = new ExcelJS.Workbook();

  // --- SHEET 1: TỔNG QUAN BÁO CÁO ---
  const ws1 = workbook.addWorksheet('Tong_Quan', { views: [{ showGridLines: true }] });
  ws1.columns = [
    { width: 34 },
    { width: 24 },
    { width: 20 },
    { width: 24 },
  ];

  // Header Title
  ws1.mergeCells('A1:D1');
  const t1 = ws1.getCell('A1');
  t1.value = 'BÁO CÁO TỔNG HỢP DOANH THU & CÔNG MAY';
  t1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 28;

  ws1.getCell('A2').value = `Kỳ thống kê: ${timeframeLabel}`;
  ws1.getCell('A2').font = { name: 'Arial', size: 10, italic: true };
  ws1.getCell('A3').value = `Chủ tiệm / Xưởng: ${shopSettings?.ownerName || 'Nguyễn Thị Ngọc'}`;
  ws1.getCell('A3').font = { name: 'Arial', size: 10, bold: true };
  ws1.getCell('A4').value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`;
  ws1.getCell('A4').font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };

  // Indicator table
  ws1.getRow(6).values = ['CHỈ SỐ TỔNG HỢP', 'GIÁ TRỊ', 'ĐƠN VỊ TÍNH'];
  ws1.getRow(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };

  const indicators = [
    ['Tổng doanh thu thực tế', stats.totalRevenue, 'VNĐ'],
    ['Tổng số đơn hàng', stats.totalOrders, 'Đơn'],
    ['Số đơn đã hoàn thành', stats.completedOrders ?? 0, 'Đơn'],
    ['Số đơn đang sửa / chờ làm', stats.pendingOrders ?? 0, 'Đơn'],
    ['Tổng số sản phẩm / công đoạn', stats.totalGarments ?? 0, 'Món / Việc'],
    ['Giá trị trung bình mỗi đơn', stats.avgOrderValue ?? Math.round(stats.totalRevenue / (stats.totalOrders || 1)), 'VNĐ'],
  ];

  indicators.forEach((ind, i) => {
    const row = ws1.getRow(7 + i);
    row.values = ind;
    row.getCell(2).numFmt = '#,##0';
    row.font = { name: 'Arial', size: 10 };
    row.getCell(1).border = thinBorder;
    row.getCell(2).border = thinBorder;
    row.getCell(3).border = thinBorder;
  });

  // Worker Stats
  let wRowIdx = 15;
  ws1.mergeCells(`A${wRowIdx}:D${wRowIdx}`);
  const wTitle = ws1.getCell(`A${wRowIdx}`);
  wTitle.value = 'THỐNG KÊ DOANH SỐ THEO THỢ MAY';
  wTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  wTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  wRowIdx++;

  ws1.getRow(wRowIdx).values = ['Tên thợ may', 'Số đơn phụ trách', 'Số món / việc làm', 'Tổng tiền công (VNĐ)'];
  ws1.getRow(wRowIdx).font = { name: 'Arial', size: 10, bold: true };
  ws1.getRow(wRowIdx).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  wRowIdx++;

  if (stats.workerMap) {
    Object.entries(stats.workerMap).forEach(([worker, data]) => {
      const row = ws1.getRow(wRowIdx);
      row.values = [worker, data.count, data.garments, data.total];
      row.getCell(4).numFmt = '#,##0';
      row.font = { name: 'Arial', size: 10 };
      row.getCell(1).border = thinBorder;
      row.getCell(2).border = thinBorder;
      row.getCell(3).border = thinBorder;
      row.getCell(4).border = thinBorder;
      wRowIdx++;
    });
  }

  // --- SHEET 2: CHI TIẾT CÁC ĐƠN HÀNG ---
  const ws2 = workbook.addWorksheet('Chi_Tiet_Don_Hang', { views: [{ showGridLines: true }] });
  ws2.columns = [
    { width: 8 },  // STT
    { width: 14 }, // Ngày
    { width: 28 }, // Mã / Tên Đơn
    { width: 22 }, // Khách hàng
    { width: 16 }, // Số điện thoại
    { width: 20 }, // Thợ phụ trách
    { width: 16 }, // Loại dịch vụ
    { width: 12 }, // Số việc
    { width: 20 }, // Thành tiền
    { width: 16 }, // Tạm ứng
    { width: 18 }, // Trạng thái
    { width: 55 }, // Chi tiết
  ];

  ws2.mergeCells('A1:L1');
  const dTitle = ws2.getCell('A1');
  dTitle.value = 'DANH SÁCH CHI TIẾT CÁC ĐƠN HÀNG - ' + timeframeLabel;
  dTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(1).height = 26;

  const detailHeaders = [
    'STT',
    'Ngày lập',
    'Mã / Tên Đơn Hàng',
    'Khách Hàng',
    'Số Điện Thoại',
    'Thợ Phụ Trách',
    'Phân Loại',
    'Số Việc',
    'Thành Tiền (VNĐ)',
    'Tạm Ứng (VNĐ)',
    'Trạng Thái',
    'Chi Tiết Công Việc & Đơn Giá',
  ];

  const hRow2 = ws2.getRow(3);
  hRow2.values = detailHeaders;
  hRow2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  hRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  hRow2.height = 22;

  orders.forEach((order, idx) => {
    const itemsSummary = order.items
      .map((it) => `${it.name} (${it.quantity} ${it.unit || 'công'} x ${it.unitPrice.toLocaleString('vi-VN')} đ)`)
      .join('; ');

    const row = ws2.getRow(4 + idx);
    row.values = [
      idx + 1,
      order.date,
      order.title,
      order.customerName || 'Khách lẻ',
      order.customerPhone || '',
      order.workerName,
      order.category === 'alteration' ? 'Sửa đồ thuê' : order.category === 'sewing' ? 'May mới' : 'Khác',
      order.items.length,
      order.finalAmount,
      order.advanceAmount || 0,
      order.status === 'completed' || order.status === 'paid' ? 'Đã hoàn thành' : 'Đang sửa',
      itemsSummary,
    ];

    row.font = { name: 'Arial', size: 10 };
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).numFmt = '#,##0';

    for (let c = 1; c <= 12; c++) {
      row.getCell(c).border = thinBorder;
    }
  });

  const cleanLabel = timeframeLabel.replace(/[\s/()\-:]+/g, '_');
  const filename = `Bao_Cao_Thong_Ke_${cleanLabel}.xlsx`;

  await downloadWorkbook(workbook, filename);
}
