import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  Sparkles,
  RotateCcw,
  Clipboard,
  Check,
  Loader2,
  FileText,
  Info,
  Zap,
} from 'lucide-react';

interface TextInputAreaProps {
  text: string;
  onChangeText: (text: string) => void;
  onAiParse: () => void;
  onOpenImageOcr: () => void;
  isAiLoading: boolean;
}

export const TextInputArea: React.FC<TextInputAreaProps> = ({
  text,
  onChangeText,
  onAiParse,
  onOpenImageOcr,
  isAiLoading,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Web Speech API if supported in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          onChangeText((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, [onChangeText]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận dạng giọng nói trực tiếp. Bạn có thể nhập tay hoặc dán văn bản.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          onChangeText(clipText.trim());
          setPasteSuccess(true);
          setPasteNotice('Đã dán nội dung từ bộ nhớ tạm thành công!');
          setTimeout(() => {
            setPasteSuccess(false);
            setPasteNotice(null);
          }, 3000);
          return;
        }
      }
    } catch {
      // Permission blocked by browser security/iframe
    }

    // Fallback: Focus into textarea and instruct user
    if (textareaRef.current) {
      textareaRef.current.focus();
      setPasteNotice('Vui lòng nhấn giữ vào ô bên dưới và chọn "Dán" (hoặc bấm Ctrl+V)');
      setTimeout(() => setPasteNotice(null), 4500);
    }
  };

  const handlePasteSample = () => {
    const sampleText = 'Nối dây viền 200k nối thun 120k. May cổ lé 120k. May lai 100k. Đã tạm ứng 100k';
    onChangeText(sampleText);
    setPasteSuccess(true);
    setPasteNotice('Đã nạp mẫu tin nhắn may sửa thử nghiệm!');
    setTimeout(() => {
      setPasteSuccess(false);
      setPasteNotice(null);
    }, 2500);
  };

  const handleClear = () => {
    onChangeText('');
    setPasteNotice(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Card Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2 truncate">
              <span>Dữ liệu đầu vào</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[11px] font-semibold">
                Nhận dạng tức thì
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-paste-clipboard"
              type="button"
              onClick={handlePaste}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all active:scale-95 ${
                pasteSuccess
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300 shadow-2xs'
              }`}
              title="Dán từ bộ nhớ tạm (Clipboard)"
            >
              {pasteSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã dán!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dán tin nhắn</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePasteSample}
              className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Nạp mẫu tin nhắn Zalo ví dụ"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Thử mẫu</span>
            </button>

            {text && (
              <button
                id="btn-clear-text"
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
                title="Xóa nội dung"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            )}
          </div>
        </div>

        {/* Notice Banner when paste triggered */}
        {pasteNotice && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-800 font-medium">
            <span>{pasteNotice}</span>
            <button
              onClick={() => setPasteNotice(null)}
              className="text-blue-500 hover:text-blue-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Textarea Workspace */}
        <div className="p-3 sm:p-5 relative bg-white">
          <textarea
            ref={textareaRef}
            id="sewing-input-text"
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            onPaste={() => {
              setPasteSuccess(true);
              setPasteNotice('Đã dán nội dung thành công!');
              setTimeout(() => {
                setPasteSuccess(false);
                setPasteNotice(null);
              }, 2500);
            }}
            placeholder="Dán tin nhắn Zalo, tin nhắn khách gửi hoặc gõ tại đây... Ví dụ: Nối dây viền 200k nối thun 120k. May cổ lé 120k. May lai 100k"
            rows={4}
            className="w-full p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-base leading-relaxed text-slate-800 font-medium placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden transition-all resize-y"
          />

          {isListening && (
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Đang nghe bạn nói...
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Voice Input Button */}
            <button
              id="btn-voice-input"
              type="button"
              onClick={toggleVoice}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                isListening
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Đọc bằng giọng nói tiếng Việt"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-600" />}
              <span>{isListening ? 'Dừng ghi âm' : 'Nói micro'}</span>
            </button>

            {/* Photo OCR Button */}
            <button
              id="btn-camera-ocr"
              type="button"
              onClick={onOpenImageOcr}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all"
              title="Chụp ảnh sổ tay / Phiếu viết tay"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Quét ảnh sổ tay</span>
            </button>
          </div>

          {/* Primary AI Enhanced Parse */}
          <button
            id="btn-ai-deep-parse"
            type="button"
            onClick={onAiParse}
            disabled={isAiLoading || !text.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all"
            title="Dùng AI phân tích sâu và chuẩn hóa công đoạn"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>PHÂN TÍCH TỰ ĐỘNG</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helper Tip Card matching Professional Polish */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-blue-900">Mẹo nhận diện nhanh</p>
          <p className="text-xs text-blue-700 leading-relaxed mt-0.5">
            Bạn có thể nhập giá trị kèm chữ <span className="font-semibold">'k'</span>, <span className="font-semibold">'nghìn'</span> hoặc số đầy đủ (ví dụ: <span className="font-semibold">Nối dây viền 200k</span>, <span className="font-semibold">10 áo x 35k</span>). Hệ thống tự động tách biệt tên công việc, số lượng và giá tiền.
          </p>
        </div>
      </div>
    </div>
  );
};
