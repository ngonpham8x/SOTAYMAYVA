import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Loader2, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ImageOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    items: any[];
    title?: string;
    workerName?: string;
    customerName?: string;
    customerPhone?: string;
  }) => void;
}

/**
 * Compress and downscale huge phone photos to ~1280px max dimension & JPEG 0.82
 * for lightning-fast network transfer and instantaneous AI vision OCR.
 */
function compressImage(file: File, maxDimension = 1400, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Không thể tải ảnh để nén.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Không thể đọc tập tin ảnh.'));
    reader.readAsDataURL(file);
  });
}

export const ImageOcrModal: React.FC<ImageOcrModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedImage(null);
      setError(null);
      setIsLoading(false);
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processImagePayload = async (base64Data: string, mime: string) => {
    setIsLoading(true);
    setError(null);
    setStatusMessage('AI đang đọc chữ viết tay & bóc tách chi tiết...');

    try {
      const response = await fetch('/api/ai/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
        }),
      });

      const responseText = await response.text();
      let resData: any;
      try {
        resData = JSON.parse(responseText);
      } catch {
        if (response.status === 504) {
          throw new Error('Nhận dạng mất quá lâu. Vui lòng thử lại với ảnh chỉ chứa sổ tay hoặc phiếu may.');
        }
        throw new Error('Máy chủ nhận dạng trả về phản hồi không hợp lệ. Vui lòng thử lại.');
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Không thể nhận dạng chữ trong ảnh.');
      }

      setStatusMessage('Đã bóc tách thành công!');
      
      // Auto-apply immediately without requiring extra manual clicks
      setTimeout(() => {
        onSuccess(resData.data);
        onClose();
      }, 400);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi gửi ảnh lên AI nhận dạng. Bạn có thể thử chụp lại rõ nét hơn.');
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    setStatusMessage('Đang nén & tối ưu chất lượng ảnh...');

    try {
      const { base64, mimeType } = await compressImage(file);
      setSelectedImage(base64);

      // Auto-trigger analysis immediately upon image selection
      await processImagePayload(base64, mimeType);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi chuẩn bị ảnh.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Quét ảnh sổ tay & Phiếu viết tay</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-md">Tự động 1-chạm</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tự động bóc tách công đoạn & đơn giá ngay sau khi chụp ảnh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <input
            type="file"
            ref={cameraInputRef}
            onClick={(event) => { event.currentTarget.value = ''; }}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <input
            type="file"
            ref={libraryInputRef}
            onClick={(event) => { event.currentTarget.value = ''; }}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!selectedImage ? (
            <div
              className="border-2 border-dashed border-blue-300 bg-blue-50/40 rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  Bấm vào đây để Chụp ảnh hoặc Tải ảnh lên
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Chụp sổ ghi chép, phiếu giao nhận, hóa đơn viết tay ("May 1: 200k, May 2: 300k...")
                </p>
              </div>
              <div className="hidden">
                <Camera className="w-3.5 h-3.5" />
                <span>Chụp / Chọn ảnh ngay</span>
              </div>
              <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  id="btn-camera-ocr-capture"
                  type="button"
                  onClick={() => !isLoading && cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4" />
                  Chụp ảnh mới
                </button>
                <button
                  id="btn-camera-ocr-library"
                  type="button"
                  onClick={() => !isLoading && libraryInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                >
                  <Upload className="h-4 w-4" />
                  Chọn từ thư viện
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-300 max-h-64 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Ảnh đã chọn"
                  className="max-h-64 object-contain w-auto"
                />

                {isLoading && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white text-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-blue-200">{statusMessage}</p>
                      <p className="text-xs text-slate-300">Hệ thống đang tự động phân tích & bóc tách...</p>
                    </div>
                  </div>
                )}
              </div>

              {!isLoading && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Chụp hoặc chọn ảnh khác</span>
                  </button>

                  <span className="text-slate-400">Đã nén tối ưu</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">Nhận dạng chưa thành công:</p>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => libraryInputRef.current?.click()}
                  className="mt-1 inline-flex items-center gap-1 font-bold text-rose-800 underline"
                >
                  Thử chụp lại ảnh góc thẳng, đủ ánh sáng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 italic">
            * Sau khi chọn ảnh, hệ thống tự động bóc tách và điền vào bảng
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>

            {selectedImage && !isLoading && !error && (
              <button
                type="button"
                onClick={() => selectedImage && processImagePayload(selectedImage, 'image/jpeg')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Phân tích lại</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
