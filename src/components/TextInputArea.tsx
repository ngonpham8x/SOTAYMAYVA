import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
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
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) finalTranscript += event.results[index][0].transcript;
      }
      const spokenText = finalTranscript.trim();
      if (!spokenText) return;
      const nextText = [textRef.current.trim(), spokenText].filter(Boolean).join(textRef.current.trim() ? ' ' : '');
      textRef.current = nextText;
      onChangeText(nextText);
      setVoiceNotice('Đã thêm nội dung từ micro. Bạn có thể tiếp tục nói hoặc bấm Dừng ghi âm.');
    };
    recognition.onerror = (event: any) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Chưa được cấp quyền micro. Hãy cho phép Micro trong cài đặt trình duyệt rồi thử lại.',
        'service-not-allowed': 'Trình duyệt đang chặn dịch vụ nhận dạng giọng nói. Hãy thử Chrome hoặc Safari bản mới nhất.',
        'no-speech': 'Chưa nghe thấy giọng nói. Hãy nói gần micro hơn rồi thử lại.',
        'network': 'Không thể kết nối dịch vụ nhận dạng giọng nói. Hãy kiểm tra Internet.',
      };
      setVoiceNotice(messages[event.error] || 'Micro chưa thể nhận dạng lúc này. Hãy thử lại sau ít giây.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setSpeechSupported(true);
    return () => recognition.abort?.();
  }, [onChangeText]);

  const toggleVoice = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setVoiceNotice(speechSupported ? 'Micro chưa sẵn sàng. Hãy tải lại trang rồi thử lại.' : 'Trình duyệt này chưa hỗ trợ nhận dạng giọng nói tiếng Việt. Hãy dùng Chrome hoặc Safari và cho phép Micro.');
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setVoiceNotice('Đã dừng micro. Nội dung đã nhận được giữ nguyên trong ô nhập.');
      return;
    }
    try {
      setVoiceNotice('Đang xin quyền micro và lắng nghe tiếng Việt...');
      recognition.start();
      setIsListening(true);
    } catch (error: any) {
      if (error?.name === 'InvalidStateError') recognition.stop();
      setIsListening(false);
      setVoiceNotice('Không thể bật micro. Hãy kiểm tra quyền Micro của trình duyệt rồi thử lại.');
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

        {voiceNotice && (
          <div role="status" className="border-b border-cyan-100 bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-900">
            {voiceNotice}
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
            placeholder="Dán tin nhắn khách gửi hoặc gõ công đoạn và giá tiền tại đây..."
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
              title={speechSupported ? 'Đọc bằng giọng nói tiếng Việt' : 'Trình duyệt chưa hỗ trợ nhận dạng giọng nói'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-blue-600" />}
              <span>{isListening ? 'Dừng ghi âm' : 'Nói micro'}</span>
            </button>

            {/* Photo OCR Button */}
            <button
              id="btn-camera-ocr"
              type="button"
              onClick={onOpenImageOcr}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border border-blue-500 shadow-md shadow-blue-500/20 transition-all active:scale-[.98]"
              title="Chụp ảnh sổ tay / Phiếu viết tay"
            >
              <Camera className="w-4 h-4" />
              <span>Quét ảnh sổ tay</span>
              <span className="hidden sm:inline rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">Nhanh</span>
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

      <details className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-blue-900">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold sm:text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600"><Info className="h-4 w-4" /></span>
          Gợi ý nhận diện (bấm để xem)
        </summary>
        <p className="mt-2 pl-9 text-xs leading-relaxed text-blue-700">
          Nhập tên công đoạn kèm số tiền; hệ thống sẽ tách công việc, số lượng và giá tiền để bạn kiểm tra trước khi lưu.
        </p>
      </details>
    </div>
  );
};
