import QRCode from 'qrcode';
import { ShopSettings } from '../types';

export interface VietQrOptions {
  bankBin?: string; // 'Eximbank' or '970431'
  accountNo: string;
  accountName: string;
  amount?: number;
  description?: string;
  template?: 'compact2' | 'compact' | 'qr_only' | 'print';
}

/**
 * Standard CRC16-CCITT calculation for VietQR EMVCo specifications
 */
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Builds the official Napas 247 EMVCo payload string recognized by all Vietnamese mobile banking apps
 */
export function buildVietQrEmvCoPayload(options: {
  bankBin?: string;
  accountNo: string;
  accountName?: string;
  amount?: number;
  description?: string;
}): string {
  // Eximbank standard Napas BIN is 970431
  let bankBin = options.bankBin || '970431';
  if (bankBin.toLowerCase() === 'eximbank') {
    bankBin = '970431';
  }
  const acc = options.accountNo || '100192186';

  const tag00 = '000201';
  const tag01 = options.amount && options.amount > 0 ? '010212' : '010211'; // 12 = Dynamic QR, 11 = Static QR

  const sub00 = '00' + String(bankBin.length).padStart(2, '0') + bankBin;
  const sub01 = '01' + String(acc.length).padStart(2, '0') + acc;
  const sub38_01 = sub00 + sub01;
  const tag38_00 = '0010A000000727';
  const tag38_01 = '01' + String(sub38_01.length).padStart(2, '0') + sub38_01;
  const tag38_02 = '0208QRIBFTTA';
  const val38 = tag38_00 + tag38_01 + tag38_02;
  const tag38 = '38' + String(val38.length).padStart(2, '0') + val38;

  const tag53 = '5303704'; // VND Currency

  let tag54 = '';
  if (options.amount && options.amount > 0) {
    const amtStr = Math.round(options.amount).toString();
    tag54 = '54' + String(amtStr.length).padStart(2, '0') + amtStr;
  }

  const tag58 = '5802VN';
  const rawName = removeVietnameseTones(options.accountName || 'NGUYEN THI NGOC').toUpperCase();
  const tag59 = '59' + String(rawName.length).padStart(2, '0') + rawName;
  const city = 'BAO LOC';
  const tag60 = '60' + String(city.length).padStart(2, '0') + city;

  let tag62 = '';
  if (options.description) {
    const cleanMemo = removeVietnameseTones(options.description).substring(0, 25);
    if (cleanMemo) {
      const sub62_08 = '08' + String(cleanMemo.length).padStart(2, '0') + cleanMemo;
      tag62 = '62' + String(sub62_08.length).padStart(2, '0') + sub62_08;
    }
  }

  const payloadNoCrc =
    tag00 + tag01 + tag38 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62 + '6304';
  const crc = crc16Ccitt(payloadNoCrc);
  return payloadNoCrc + crc;
}

// Static official QR string for Eximbank - NGUYEN THI NGOC - 100192186 - Bao Loc
export const OFFICIAL_EXIMBANK_EMVCO =
  '00020101021138530010A0000007270123000697043101091001921860208QRIBFTTA53037045802VN5915NGUYEN THI NGOC6007BAO LOC630436C7';

export const OFFICIAL_VIETQR_CARD_URL = '/qr-ngan-hang.jpg';
export const OFFICIAL_QR_PNG_URL = '/qr-ngan-hang.jpg';

/**
 * Returns the public VietQR image API URL
 */
export function getVietQrImageUrl(options: VietQrOptions): string {
  const bank = options.bankBin || '970431';
  const accountNo = options.accountNo || '100192186';
  const template = options.template || 'compact2';
  const accountName = encodeURIComponent(options.accountName || 'NGUYEN THI NGOC');

  let url = `https://img.vietqr.io/image/${bank}-${accountNo}-${template}.png?accountName=${accountName}`;

  if (options.amount && options.amount > 0) {
    url += `&amount=${Math.round(options.amount)}`;
  }

  if (options.description) {
    const cleanDesc = removeVietnameseTones(options.description).substring(0, 50);
    url += `&addInfo=${encodeURIComponent(cleanDesc)}`;
  }

  return url;
}

/**
 * Helper to remove Vietnamese tones for banking transfer descriptions
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
}

/**
 * Generates an offline data URL QR code using the `qrcode` library
 */
export async function generateQrDataUrl(
  text: string,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 240,
      margin: options?.margin || 1,
      color: {
        dark: options?.darkColor || '#000000',
        light: options?.lightColor || '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    return '';
  }
}
