import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Shirt,
  Sparkle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ParsedItem, ItemType } from '../types';
import { formatVND } from '../utils/textParser';

export interface AlterationService {
  id: string;
  name: string;
  category: 'pants' | 'dress' | 'rental' | 'accessories';
  categoryLabel: string;
  defaultPrice: number;
  unit: string;
  type?: ItemType;
  popular?: boolean;
}

export const ALTERATION_SERVICES: AlterationService[] = [
  // Sửa Quần
  { id: 'p1', name: 'Cắt gấu / Lên lai quần jean', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 30000, unit: 'cái', popular: true },
  { id: 'p2', name: 'Cắt gấu / Lên lai quần tây', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 25000, unit: 'cái', popular: true },
  { id: 'p3', name: 'Bóp eo / Hạ cạp lưng quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 35000, unit: 'cái', popular: true },
  { id: 'p4', name: 'Bóp ống / Bóp đùi quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 30000, unit: 'cái', popular: true },
  { id: 'p5', name: 'Nới lưng / Chêm vải lưng quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 40000, unit: 'cái' },
  { id: 'p6', name: 'Thay dây kéo khóa quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 25000, unit: 'cái', popular: true },
  { id: 'p7', name: 'Thay dây kéo đồng jean', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 35000, unit: 'cái' },
  { id: 'p8', name: 'Mạng rách / Vá đáy quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 30000, unit: 'cái' },
  { id: 'p9', name: 'Đóng nút / Cúc quần jean', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 15000, unit: 'cái' },
  { id: 'p10', name: 'Thay thun lưng quần', category: 'pants', categoryLabel: 'Sửa Quần', defaultPrice: 25000, unit: 'cái' },

  // Sửa Áo & Váy Đầm
  { id: 'd1', name: 'Cắt ngắn lai áo thun / sơ mi', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 30000, unit: 'cái', popular: true },
  { id: 'd2', name: 'Cắt ngắn tay áo', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 25000, unit: 'cái' },
  { id: 'd3', name: 'Bóp sườn / Hạ nách áo', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 35000, unit: 'cái', popular: true },
  { id: 'd4', name: 'Bóp eo / Chỉnh dáng đầm', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 45000, unit: 'cái', popular: true },
  { id: 'd5', name: 'Cắt ngắn lai đầm / váy xòe', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 40000, unit: 'cái' },
  { id: 'd6', name: 'Thay dây kéo giọt nước đầm', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 35000, unit: 'cái', popular: true },
  { id: 'd7', name: 'Thay lót áo vest / đầm', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 80000, unit: 'cái' },
  { id: 'd8', name: 'Đơm nút / Cúc áo sơ mi/vest', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 10000, unit: 'lần' },
  { id: 'd9', name: 'Nới thân áo / Đắp phối vải', category: 'dress', categoryLabel: 'Áo & Váy Đầm', defaultPrice: 40000, unit: 'cái' },

  // Sửa Đồ Thuê & Áo Dài
  { id: 'r1', name: 'Chỉnh size đầm dạ hội thuê', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 60000, unit: 'bộ', popular: true },
  { id: 'r2', name: 'Sửa áo dài cưới / hội nghị thuê', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 70000, unit: 'bộ', popular: true },
  { id: 'r3', name: 'Nới size trang phục biểu diễn thuê', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 50000, unit: 'bộ', popular: true },
  { id: 'r4', name: 'Giặt hấp & Phục hồi đồ thuê', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 50000, unit: 'bộ' },
  { id: 'r5', name: 'Đính kết cườm / Hạt đá trang phục', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 40000, unit: 'lần' },
  { id: 'r6', name: 'Tiền thuê trang phục / ngày', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 150000, unit: 'bộ' },
  { id: 'r7', name: 'Cọc giữ đồ thuê (Tạm ứng)', category: 'rental', categoryLabel: 'Sửa Đồ Thuê', defaultPrice: 200000, unit: 'lần', type: 'advance' },

  // Phụ liệu & Khác
  { id: 'a1', name: 'Ủi định hình / Ủi hoàn thiện', category: 'accessories', categoryLabel: 'Phụ liệu & Khác', defaultPrice: 15000, unit: 'cái' },
  { id: 'a2', name: 'May cổ lé / Viền bọc phụ liệu', category: 'accessories', categoryLabel: 'Phụ liệu & Khác', defaultPrice: 35000, unit: 'cái' },
  { id: 'a3', name: 'Cung cấp dây kéo / Khóa đồng xịn', category: 'accessories', categoryLabel: 'Phụ liệu & Khác', defaultPrice: 20000, unit: 'cái', type: 'material' },
];

interface AlterationCatalogProps {
  onAppendText: (textToAppend: string) => void;
  onDirectAddItem: (item: ParsedItem) => void;
}

export const AlterationCatalog: React.FC<AlterationCatalogProps> = ({
  onAppendText,
  onDirectAddItem,
}) => {
  // Collapsed / hidden by default - only opens when user clicks
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pants' | 'dress' | 'rental' | 'accessories'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = ALTERATION_SERVICES.filter((srv) => {
    const matchesTab = activeTab === 'all' || srv.category === activeTab;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSelectService = (srv: AlterationService) => {
    const kPrice = Math.round(srv.defaultPrice / 1000);
    const textSnippet = `${srv.name} ${kPrice}k`;
    onAppendText(textSnippet);
  };

  const handleDirectAdd = (srv: AlterationService, e: React.MouseEvent) => {
    e.stopPropagation();
    const newItem: ParsedItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: srv.name,
      quantity: 1,
      unit: srv.unit,
      unitPrice: srv.defaultPrice,
      amount: srv.defaultPrice,
      type: srv.type || 'work',
    };
    onDirectAddItem(newItem);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
      {/* Accordion Bar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`p-3 sm:p-3.5 bg-slate-50/90 hover:bg-slate-100/90 cursor-pointer flex items-center justify-between transition-colors ${
          isOpen ? 'border-b border-slate-200' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Chi Tiết Dịch Vụ Sửa Quần Áo & Đồ Thuê
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] sm:text-[11px] font-bold whitespace-nowrap shrink-0">
                Chọn nhanh 1-chạm
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block truncate">
              {isOpen
                ? 'Bấm vào dịch vụ để thêm nhanh hoặc điền vào ô nhập'
                : 'Bấm vào đây để mở danh mục mẫu dịch vụ cắt may & sửa đồ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 rounded-lg shrink-0 transition-colors ml-2">
          <span>{isOpen ? 'Thu gọn' : 'Hiện danh mục'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3 bg-slate-50/40">
          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({ALTERATION_SERVICES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pants')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'pants'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👖 Sửa Quần</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dress')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'dress'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👗 Áo & Đầm</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rental')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'rental'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>✨ Sửa Đồ Thuê</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('accessories')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'accessories'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phụ liệu & Khác
              </button>
            </div>

            {/* Quick Search in catalog */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm dịch vụ sửa..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:ring-1 focus:ring-blue-500 rounded-lg outline-hidden text-slate-800"
              />
            </div>
          </div>

          {/* Chips Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                onClick={() => handleSelectService(srv)}
                className="group p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs"
                title="Bấm để chèn vào ô nhập hoặc bấm dấu '+' để thêm ngay vào bảng"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                      {srv.name}
                    </p>
                    {srv.popular && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                        Phổ biến
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-blue-600">
                      {formatVND(srv.defaultPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">/{srv.unit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDirectAdd(srv, e)}
                    className="p-1 rounded-md bg-slate-100 group-hover:bg-blue-600 text-slate-600 group-hover:text-white transition-colors"
                    title="Thêm trực tiếp 1 dòng vào bảng tính"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>💡 Mẹo: Bấm vào thẻ để chèn chữ vào ô nhập, hoặc bấm dấu <strong className="text-blue-700">[+]</strong> để thêm ngay 1 dòng vào bảng kê.</span>
            <span className="font-semibold">{filteredServices.length} dịch vụ có sẵn</span>
          </div>
        </div>
      )}
    </div>
  );
};
