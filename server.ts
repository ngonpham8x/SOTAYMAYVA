import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { get, put } from "@vercel/blob";
import dotenv from "dotenv";
import { createHmac, timingSafeEqual } from "crypto";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy init Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Fallback models in priority order according to supported @google/genai models
const MODEL_CANDIDATES = [
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// Helper delay for exponential backoff
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate content with automatic retry and fallback model switching
 * to handle temporary 503 (model overloaded / high demand) and 429 rate limit errors.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  // Add thinkingBudget: 0 to eliminate thinking latency for sub-second responses
  const baseConfig = {
    ...params.config,
    thinkingConfig: { thinkingBudget: 0 },
  };

  for (const model of MODEL_CANDIDATES) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: baseConfig,
        });

        if (response && response.text) {
          return { response, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("overloaded");

        console.warn(
          `[Gemini API] Attempt ${attempt} failed on model "${model}": ${errMsg.slice(0, 150)}`
        );

        if (isTransient && attempt < 2) {
          await delay(300 * attempt);
          continue;
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến dịch vụ AI.");
}

/**
 * Safely parse JSON from model output (handling markdown backticks if present)
 */
function safeParseJson(rawText: string | undefined): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON parse warning:", e, "Raw text:", cleaned.slice(0, 100));
    return {};
  }
}

/**
 * Server-side fallback rule parser for Vietnamese tailoring/alteration text
 */
function serverFallbackTextParse(text: string) {
  const pricePattern =
    /(?:[-+]?\s*)?(?:\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|ng|tr|triệu|đ|vnd|vnđ)|\b\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|vnd|vnđ))?|\b\d{2,3}k\b|\b\d{5,9}\b)/gi;

  const matches: { start: number; end: number; rawPrice: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = pricePattern.exec(text)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      rawPrice: m[0].trim(),
    });
  }

  const items: any[] = [];
  if (matches.length > 0) {
    let lastEnd = 0;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      let segment = text.slice(lastEnd, match.start).trim();
      segment = segment.replace(/^[\s,;.:\-+/*=]+|[\s,;.:\-+/*=]+$/g, "").trim();

      const raw = match.rawPrice.toLowerCase().replace(/[^0-9.,knghtr]/g, "");
      let price = 0;
      if (raw.includes("k") || raw.includes("ng")) {
        price = parseFloat(raw.replace(/[^0-9.]/g, "")) * 1000;
      } else if (raw.includes("tr")) {
        price = parseFloat(raw.replace(/[^0-9.]/g, "")) * 1000000;
      } else {
        const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
        price = num < 1000 && num > 0 ? num * 1000 : num || 0;
      }

      let quantity = 1;
      let unit = "cái";
      let name = segment;

      const qtyMatch = segment.match(/^(\d+)\s*(cái|áo|quần|bộ|mét|m|lần)?\s*[x*]?\s*(.*)$/i);
      if (qtyMatch && qtyMatch[3]) {
        quantity = parseInt(qtyMatch[1], 10) || 1;
        if (qtyMatch[2]) unit = qtyMatch[2];
        name = qtyMatch[3].trim();
      }

      if (!name) name = `Công đoạn ${i + 1}`;
      name = name.charAt(0).toUpperCase() + name.slice(1);

      const isAdvance = /^(ứng|tạm ứng|cọc|đã cọc)/i.test(segment);
      const isDiscount = /^(giảm|bớt|chiết khấu)/i.test(segment);
      const type = isAdvance ? "advance" : isDiscount ? "discount" : "work";

      items.push({
        name,
        quantity,
        unit,
        unitPrice: price,
        amount: quantity * price,
        type,
      });

      lastEnd = match.end;
    }
  }

  return {
    title: "Bóc tách công may",
    items,
  };
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

type AppLoginAccount = { email: string; password: string };

const AUTH_COOKIE_NAME = 'sotaymayva_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getLoginAccounts(): AppLoginAccount[] {
  const fromEnvironmentFields = [1, 2, 3].map((index) => ({
    email: normalizeEmail(process.env[`APP_LOGIN_EMAIL_${index}`]),
    password: process.env[`APP_LOGIN_PASSWORD_${index}`] || '',
  }));

  const raw = process.env.APP_LOGIN_ACCOUNTS?.trim();
  let fromJson: AppLoginAccount[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed)
        ? parsed.map((entry) => [entry?.email, entry?.password])
        : Object.entries(parsed || {});
      fromJson = entries.map(([email, password]) => ({
        email: normalizeEmail(email),
        password: typeof password === 'string' ? password : '',
      }));
    } catch {
      fromJson = [];
    }
  }

  const validAccounts = [...fromEnvironmentFields, ...fromJson]
    .filter((account) => /^\S+@\S+\.\S+$/.test(account.email) && account.password.length > 0);
  return Array.from(new Map(validAccounts.map((account) => [account.email, account])).values());
}
function getSessionSecret(): string {
  return process.env.APP_SESSION_SECRET || '';
}

function isAppAuthConfigured(): boolean {
  return getLoginAccounts().length > 0 && getSessionSecret().length >= 32;
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function signSession(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSessionToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_DURATION_MS })).toString('base64url');
  return `${payload}.${signSession(payload)}`;
}

function readCookie(req: express.Request, name: string): string | null {
  const rawCookies = req.headers.cookie || '';
  const prefix = `${name}=`;
  const item = rawCookies.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function getSessionEmail(req: express.Request): string | null {
  if (!isAppAuthConfigured()) return null;
  const token = readCookie(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !secureEqual(signature, signSession(payload))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const email = normalizeEmail(decoded?.email);
    const isKnownAccount = getLoginAccounts().some((account) => account.email === email);
    return isKnownAccount && Number(decoded?.exp) > Date.now() ? email : null;
  } catch {
    return null;
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  };
}

app.get('/api/auth/session', (req, res) => {
  const authConfigured = isAppAuthConfigured();
  const email = authConfigured ? getSessionEmail(req) : null;
  res.json({ authenticated: Boolean(email), email: email || undefined, authConfigured });
});

app.post('/api/auth/login', (req, res) => {
  if (!isAppAuthConfigured()) {
    return res.status(503).json({ error: 'Đăng nhập chưa được cấu hình trên máy chủ.' });
  }
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const account = getLoginAccounts().find((entry) => entry.email === email);
  if (!account || !secureEqual(password, account.password)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  }
  res.cookie(AUTH_COOKIE_NAME, createSessionToken(email), sessionCookieOptions());
  return res.json({ authenticated: true, email });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ authenticated: false });
});

app.use('/api', (req, res, next) => {
  if (req.originalUrl.startsWith('/api/cron/daily-backup')) return next();
  if (!isAppAuthConfigured()) {
    return res.status(503).json({ error: 'Đăng nhập ứng dụng chưa được cấu hình.' });
  }
  if (!getSessionEmail(req)) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng tính năng này.' });
  }
  return next();
});

// API: AI Smart Parser for Garment / Tailoring / Piecework tasks
app.post("/api/ai/parse-text", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Vui lòng cung cấp văn bản cần nhận dạng." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    const fallbackData = serverFallbackTextParse(text);
    return res.json({
      success: true,
      data: fallbackData,
      isFallback: true,
      message: "Đã bóc tách tự động bằng bộ quy tắc thông minh.",
    });
  }

  const prompt = `Bạn là chuyên gia bóc tách công đoạn may mặc, tính tiền công thợ may, may gia công và chi phí phụ liệu may.
Hãy phân tích văn bản sau đây và bóc tách từng công đoạn / hạng mục thành danh sách chi tiết:
Văn bản đầu vào: "${text}"

Quy tắc bóc tách:
1. Đơn vị tiền tệ:
   - "k", "nghìn", "ngàn" = x 1.000 (Ví dụ: "200k" -> 200000, "120k" -> 120000).
   - "tr", "triệu" = x 1.000.000 (Ví dụ: "1.5tr" -> 1500000).
   - Nếu viết số trần như "120000" hoặc "120.000" -> 120000.
2. Tên công đoạn: Chuẩn hóa tiếng Việt có dấu, rõ ràng (ví dụ "Nối dây viền", "Nối thun", "May cổ lé", "May lai", "Ráp sườn", "Vắt sổ", "Tra dây kéo",...).
3. Số lượng (quantity): Mặc định là 1 nếu không nói rõ. Nếu có như "5 cái", "10 áo", "3m" thì quantity = số đó, unit = "cái", "áo", "mét", v.v.
4. Đơn giá (unitPrice): Giá cho 1 đơn vị.
5. Thành tiền (amount): quantity * unitPrice.
6. Loại (type):
   - "work": công đoạn may, ráp, cắt, ủi, vắt sổ, đơm nút
   - "material": phụ liệu như dây kéo, thun, chỉ, hạt nút, keo, ren
   - "advance": tạm ứng trước, cọc tiền (số tiền âm hoặc ghi chú ứng)
   - "discount": giảm trừ, chiết khấu
7. Trích xuất thêm nếu có: Tên thợ may (workerName), Tên khách hàng (customerName), Tên mẫu/Mã hàng (title), Ghi chú (note).`;

  try {
    const { response } = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tiêu đề hoặc mẫu hàng hóa (nếu nhận diện được)" },
            workerName: { type: Type.STRING, description: "Tên thợ may nếu có" },
            customerName: { type: Type.STRING, description: "Tên khách hàng hoặc xưởng nếu có" },
            customerPhone: { type: Type.STRING, description: "Số điện thoại khách hàng nếu có" },
            note: { type: Type.STRING, description: "Ghi chú chung nếu có" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Tên công đoạn hoặc hạng mục" },
                  quantity: { type: Type.NUMBER, description: "Số lượng" },
                  unit: { type: Type.STRING, description: "Đơn vị tính (cái, mét, lần, áo...)" },
                  unitPrice: { type: Type.NUMBER, description: "Đơn giá dạng số nguyên VND" },
                  amount: { type: Type.NUMBER, description: "Thành tiền dạng số nguyên VND" },
                  type: {
                    type: Type.STRING,
                    description: "Loại: work, material, advance, discount",
                  },
                  note: { type: Type.STRING, description: "Ghi chú riêng cho công đoạn này" },
                },
                required: ["name", "quantity", "unitPrice", "amount"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const parsedData = safeParseJson(response.text);
    if (!parsedData.items || parsedData.items.length === 0) {
      const fallback = serverFallbackTextParse(text);
      return res.json({ success: true, data: fallback, isFallback: true });
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Gemini parse-text fallback used:", error.message);
    const fallback = serverFallbackTextParse(text);
    return res.json({
      success: true,
      data: fallback,
      isFallback: true,
      warning: "Máy chủ AI đang có lượng tải lớn, đã tự động bóc tách chuẩn xác bằng bộ phân tích nhanh.",
    });
  }
});

// API: AI Vision OCR Parser for Paper Notes, Notebooks, Invoices
app.post("/api/ai/parse-image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Vui lòng cung cấp dữ liệu hình ảnh." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng thiết lập API key trong mục Secrets.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, "");

    const prompt = `Đây là hình ảnh ghi chép sổ tay thợ may, phiếu viết tay may gia công, phiếu sửa quần áo thuê, hoặc hóa đơn may mặc.
Nhiệm vụ:
1. Đọc và nhận dạng toàn bộ chữ viết tay / chữ in, các dòng ghi chép (ví dụ: "May 1: 200k", "May 2: 300k", "May 3: 600k", "Sửa đầm 60k", "Cắt gấu quần 30k", "Thay khóa 25k", "Đơm nút 10k"...).
2. Quy đổi đơn vị tiền tệ: "k", "nghìn", "ngàn" -> nhân 1.000 (Ví dụ: "200k" = 200000, "300k" = 300000, "600k" = 600000, "25k" = 25000).
3. Bóc tách từng dòng thành mục riêng trong danh sách items:
   - name: Tên công đoạn / món may (ví dụ "May 1", "May 2", "Chỉnh size đầm", "Cắt gấu quần jean",...)
   - quantity: Số lượng (mặc định 1)
   - unit: Đơn vị tính ("cái", "bộ", "lần", "công")
   - unitPrice: Đơn giá VND
   - amount: Thành tiền VND (quantity * unitPrice)
   - type: "work" (công may/sửa) | "material" (phụ liệu) | "advance" (tạm ứng) | "discount" (giảm trừ)
4. Nếu có, trích xuất: Tên khách hàng (customerName), Số điện thoại khách hàng (customerPhone), Tên thợ may (workerName), Tiêu đề (title), Ghi chú (note).`;

    const { response } = await generateContentWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Tiêu đề hoặc mẫu hàng hóa" },
            workerName: { type: Type.STRING, description: "Tên thợ may" },
            customerName: { type: Type.STRING, description: "Tên khách hàng sửa đồ" },
            customerPhone: { type: Type.STRING, description: "Số điện thoại khách hàng" },
            note: { type: Type.STRING, description: "Ghi chú nếu có" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Tên công đoạn hoặc chi phí" },
                  quantity: { type: Type.NUMBER, description: "Số lượng" },
                  unit: { type: Type.STRING, description: "Đơn vị tính" },
                  unitPrice: { type: Type.NUMBER, description: "Đơn giá (VND)" },
                  amount: { type: Type.NUMBER, description: "Thành tiền (VND)" },
                  type: { type: Type.STRING, description: "work | material | advance | discount" },
                  note: { type: Type.STRING, description: "Ghi chú riêng" },
                },
                required: ["name", "quantity", "unitPrice", "amount"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const parsedData = safeParseJson(response.text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error parsing image with Gemini:", error);
    return res.status(500).json({
      error:
        error.message?.includes("503") || error.message?.includes("UNAVAILABLE")
          ? "Máy chủ AI đang có lượng yêu cầu cao, vui lòng thử bấm quét lại sau ít giây."
          : error.message || "Lỗi khi nhận dạng hình ảnh.",
    });
  }
});

// API: Audio Voice Memo Parser
app.post("/api/ai/parse-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Vui lòng cung cấp dữ liệu âm thanh." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: "Chưa cấu hình GEMINI_API_KEY." });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, "");

    const prompt = `Hãy nghe đoạn ghi âm giọng nói tiếng Việt này về việc tính tiền công may / tính chi phí may mặc (ví dụ: "Cắt gấu 30k, sửa khóa 50k").
Hãy chuyển văn bản giọng nói và bóc tách từng công đoạn, số lượng, đơn giá (200k = 200000, 120k = 120000) và thành tiền.`;

    const { response } = await generateContentWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcribedText: { type: Type.STRING, description: "Văn bản đọc được từ giọng nói" },
            title: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                },
                required: ["name", "quantity", "unitPrice", "amount"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const parsedData = safeParseJson(response.text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error parsing audio with Gemini:", error);
    return res.status(500).json({
      error:
        error.message?.includes("503") || error.message?.includes("UNAVAILABLE")
          ? "Hệ thống AI đang bận, vui lòng thử lại sau giây lát."
          : error.message || "Lỗi khi xử lý giọng nói.",
    });
  }
});

const BACKUP_BLOB_PATH = "sotaymayva/latest-recovery-backup.json";
const BACKUP_STATUS_BLOB_PATH = "sotaymayva/daily-email-status.json";
const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const MAX_BACKUP_ORDERS = 5_000;

type BackupPayload = {
  appName: string;
  backupDate: string;
  timestamp: number;
  totalOrders: number;
  totalRevenue: number;
  shopSettings?: Record<string, unknown>;
  orders: Record<string, any>[];
};

function vietnamDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createBackupPayload(body: any): BackupPayload {
  const orders = body?.orders;
  if (!Array.isArray(orders)) {
    throw new Error("Dữ liệu đơn hàng không hợp lệ.");
  }
  if (orders.length > MAX_BACKUP_ORDERS) {
    throw new Error(`Bản sao lưu chỉ hỗ trợ tối đa ${MAX_BACKUP_ORDERS} đơn hàng mỗi lần.`);
  }

  const totalRevenue = orders.reduce((sum: number, order: any) => {
    const amount = Number(order?.finalAmount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const payload: BackupPayload = {
    appName: "Sổ May & Sửa Đồ Thông Minh",
    backupDate: vietnamDate(),
    timestamp: Date.now(),
    totalOrders: orders.length,
    totalRevenue,
    shopSettings: body?.shopSettings,
    orders,
  };

  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_BACKUP_BYTES) {
    throw new Error("Dữ liệu sao lưu quá lớn. Hãy xuất tệp JSON thủ công để lưu toàn bộ dữ liệu.");
  }
  return payload;
}

function ensureBlobConfigured(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Chưa cấu hình kho lưu trữ riêng tư cho sao lưu tự động.");
  }
}

async function saveLatestBackup(payload: BackupPayload): Promise<void> {
  ensureBlobConfigured();
  await put(BACKUP_BLOB_PATH, JSON.stringify(payload), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as T;
}

async function readLatestBackup(): Promise<BackupPayload | null> {
  ensureBlobConfigured();
  return readBlobJson<BackupPayload>(BACKUP_BLOB_PATH);
}

async function readEmailStatus(): Promise<{ sentDate?: string } | null> {
  ensureBlobConfigured();
  return readBlobJson<{ sentDate?: string }>(BACKUP_STATUS_BLOB_PATH);
}

async function recordEmailStatus(sentDate: string): Promise<void> {
  await put(BACKUP_STATUS_BLOB_PATH, JSON.stringify({ sentDate, sentAt: new Date().toISOString() }), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
  });
}

function getBackupRecipients(): string[] {
  const rawRecipients = process.env.BACKUP_TARGET_EMAILS?.trim() || process.env.BACKUP_TARGET_EMAIL?.trim() || '';
  const recipients = Array.from(new Set(rawRecipients.split(/[;,]/).map((email) => email.trim()).filter(Boolean)));
  if (recipients.length === 0 || recipients.some((email) => !/^\S+@\S+\.\S+$/.test(email))) {
    throw new Error("Chưa cấu hình email nhận bản sao lưu hợp lệ.");
  }
  return recipients;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("Chưa cấu hình SMTP để gửi email sao lưu.");
  }
  return { host, user, pass, port: Number(process.env.SMTP_PORT) || 587 };
}

async function sendBackupEmail(payload: BackupPayload, isManual: boolean): Promise<void> {
  const recipients = getBackupRecipients();
  const smtp = getSmtpConfig();
  const formattedRevenue = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(payload.totalRevenue);
  const ownerName = escapeHtml(payload.shopSettings?.ownerName || "Chủ tiệm");
  const orderRowsHtml = payload.orders
    .slice(0, 15)
    .map((order, index) => {
      const amount = Number(order?.finalAmount);
      return `<tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 8px 12px; color: #64748b;">#${index + 1}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #1e293b;">${escapeHtml(order?.title || "May/Sửa đồ")}</td>
        <td style="padding: 8px 12px; color: #334155;">${escapeHtml(order?.customerName || "Khách lẻ")}</td>
        <td style="padding: 8px 12px; color: #64748b;">${escapeHtml(order?.date || payload.backupDate)}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #2563eb; text-align: right;">${new Intl.NumberFormat("vi-VN").format(Number.isFinite(amount) ? amount : 0)} đ</td>
      </tr>`;
    })
    .join("");

  const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px;color:#fff;">
      <h1 style="margin:0 0 6px;font-size:20px;">🧵 BẢN SAO LƯU DỮ LIỆU KHÔI PHỤC</h1>
      <p style="margin:0;font-size:13px;opacity:.9;">Tiệm May &amp; Sửa Đồ ${ownerName} — dữ liệu lưu ngày ${payload.backupDate}</p>
    </div>
    <div style="padding:24px;">
      <p><strong>${isManual ? "Sao lưu theo yêu cầu" : "Sao lưu tự động hằng ngày"}</strong></p>
      <p>Tổng số đơn: <strong>${payload.totalOrders}</strong> &nbsp;•&nbsp; Tổng doanh thu: <strong>${formattedRevenue}</strong></p>
      <h3 style="font-size:15px;color:#1e293b;">Đơn hàng gần nhất</h3>
      <table style="width:100%;border-collapse:collapse;"><tbody>${orderRowsHtml || '<tr><td style="padding:16px;color:#64748b;">Chưa có đơn hàng</td></tr>'}</tbody></table>
      <div style="margin-top:24px;background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;color:#1e40af;line-height:1.5;">
        <strong>Cách khôi phục:</strong> tải tệp đính kèm, mở ứng dụng, vào <strong>“Khôi phục &amp; Sao lưu”</strong> rồi chọn tệp JSON.
      </div>
    </div>
  </div>`;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Sổ May & Sửa Đồ" <${smtp.user}>`,
    to: recipients,
    subject: `[SAO LƯU TIỆM MAY] ${payload.backupDate} (${payload.totalOrders} đơn - ${formattedRevenue})`,
    html: emailHtml,
    attachments: [{
      filename: `SaoLuu_SoMay_${payload.backupDate}.json`,
      content: JSON.stringify(payload, null, 2),
      contentType: "application/json",
    }],
  });
}

app.post("/api/backup/snapshot", async (req, res) => {
  try {
    const payload = createBackupPayload(req.body);
    await saveLatestBackup(payload);
    return res.json({ success: true, ordersCount: payload.totalOrders });
  } catch (error: any) {
    console.error("Backup snapshot error:", error);
    return res.status(503).json({ error: error.message || "Không thể lưu bản sao lưu riêng tư." });
  }
});

// A manual request emails immediately. Background requests only update the private
// recovery snapshot; Vercel Cron sends that newest snapshot each day.
app.post("/api/backup/email-daily", async (req, res) => {
  try {
    const payload = createBackupPayload(req.body);
    await saveLatestBackup(payload);

    if (!req.body?.isManual) {
      return res.json({
        success: true,
        scheduled: true,
        message: "Đã lưu bản sao lưu riêng tư. Email khôi phục sẽ được gửi tự động hằng ngày.",
        ordersCount: payload.totalOrders,
      });
    }

    await sendBackupEmail(payload, true);
    return res.json({
      success: true,
      message: "Đã gửi tệp khôi phục về email riêng tư của chủ tiệm.",
      ordersCount: payload.totalOrders,
    });
  } catch (error: any) {
    console.error("Backup email error:", error);
    return res.status(503).json({ error: error.message || "Không thể tạo hoặc gửi bản sao lưu." });
  }
});

app.get("/api/cron/daily-backup", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.get("authorization") !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Cron không được xác thực." });
  }

  try {
    const today = vietnamDate();
    const status = await readEmailStatus();
    if (status?.sentDate === today) {
      return res.json({ success: true, skipped: true, message: "Email hôm nay đã được gửi." });
    }

    const payload = await readLatestBackup();
    if (!payload) {
      return res.status(404).json({ error: "Chưa có dữ liệu để sao lưu." });
    }

    await sendBackupEmail(payload, false);
    await recordEmailStatus(today);
    return res.json({ success: true, message: "Đã gửi email sao lưu tự động." });
  } catch (error: any) {
    console.error("Daily backup cron error:", error);
    return res.status(503).json({ error: error.message || "Không thể gửi email sao lưu tự động." });
  }
});

// Vite middleware in dev or static files in prod
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

// Vercel imports this Express app from files in /api. Running a listener there
// would keep a serverless invocation alive, so only start it for local use.
if (process.env.VERCEL !== "1") {
  void start();
}

export default app;
