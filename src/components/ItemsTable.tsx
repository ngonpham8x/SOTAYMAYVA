import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Scissors,
  Layers,
  ArrowDownCircle,
  Gift,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  Minus,
} from 'lucide-react';
import { ParsedItem, ItemType } from '../types';
import { formatVND } from '../utils/textParser';

interface ItemsTableProps {
  items: ParsedItem[];
  onUpdateItem: (id: string, updated: Partial<ParsedItem>) => void;
  onDeleteItem: (id: string) => void;
  onAddItem: () => void;
  onDuplicateItem: (id: string) => void;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onDuplicateItem,
}) => {
  // Default to cards on mobile and allow user to switch view modes
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const getTypeBadge = (type: ItemType) => {
    switch (type) {
      case 'advance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowDownCircle className="w-3 h-3" /> Đã ứng
          </span>
        );
      case 'discount':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Gift className="w-3 h-3" /> Giảm giá
          </span>
        );
      case 'material':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Layers className="w-3 h-3" /> Phụ liệu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Scissors className="w-3 h-3 text-slate-500" /> Công may
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-sm">
                Bảng kê chi tiết
              </h2>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[11px] font-extrabold uppercase tracking-tight">
                ĐÃ NHẬN DIỆN: {String(items.length).padStart(2, '0')} MỤC
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng thẻ (tối ưu cho điện thoại)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs">Dạng thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng bảng (tối ưu cho máy tính)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-xs">Dạng bảng</span>
            </button>
          </div>

          {/* Add Item Button */}
          <button
            id="btn-add-item-row"
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm dòng mới</span>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Scissors className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Chưa có công đoạn nào được nhận dạng.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Hãy nhập nội dung ở ô trên hoặc chọn một dịch vụ trong danh mục để thêm công đoạn.
          </p>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Thêm thủ công 1 dòng
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= MOBILE CARD VIEW (DEFAULT) ================= */
        <div className="p-3 sm:p-4 bg-slate-50/50 space-y-3">
          {items.map((item, idx) => {
            const isAdvance = item.type === 'advance';
            const isDiscount = item.type === 'discount';
            const isMaterial = item.type === 'material';

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all ${
                  isAdvance
                    ? 'border-rose-200 bg-rose-50/20'
                    : isDiscount
                    ? 'border-blue-200 bg-blue-50/20'
                    : isMaterial
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Top Row: STT + Name + Actions */}
                <div className="flex items-start gap-2.5 mb-3">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono font-extrabold text-xs flex items-center justify-center shadow-2xs">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        onUpdateItem(item.id, { name: e.target.value })
                      }
                      className="w-full text-sm sm:text-base font-bold text-slate-900 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500/40 rounded-lg px-2.5 py-1.5 border border-slate-200 focus:border-blue-500 outline-hidden transition-all placeholder:text-slate-400"
                      placeholder="Nhập tên công việc / sửa đồ..."
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDuplicateItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 rounded-lg border border-transparent hover:border-blue-200 transition-all"
                      title="Nhân đôi dòng"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-lg border border-transparent hover:border-rose-200 transition-all"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Quantity, Unit, Price, Total Amount */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 items-center">
                  {/* Quantity with +/- touch buttons */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Số lượng
                    </label>
                    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newQty = Math.max(1, item.quantity - 1);
                          onUpdateItem(item.id, {
                            quantity: newQty,
                            amount: newQty * item.unitPrice,
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded active:scale-90 transition-all"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          onUpdateItem(item.id, {
                            quantity: qty,
                            amount: qty * item.unitPrice,
                          });
                        }}
                        className="w-full text-center font-mono font-bold text-sm bg-transparent outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newQty = item.quantity + 1;
                          onUpdateItem(item.id, {
                            quantity: newQty,
                            amount: newQty * item.unitPrice,
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white rounded active:scale-90 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Unit (ĐVT) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Đơn vị (ĐVT)
                    </label>
                    <input
                      type="text"
                      value={item.unit || 'công'}
                      onChange={(e) =>
                        onUpdateItem(item.id, { unit: e.target.value })
                      }
                      className="w-full h-8 text-center text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 focus:border-blue-400 outline-hidden transition-all"
                      placeholder="công"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Đơn giá (đ)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const price = parseInt(e.target.value, 10) || 0;
                        onUpdateItem(item.id, {
                          unitPrice: price,
                          amount: item.quantity * price,
                        });
                      }}
                      className="w-full h-8 text-right font-mono text-xs font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border border-slate-200 focus:border-blue-400 px-2 outline-hidden transition-all"
                      placeholder="0"
                    />
                  </div>

                  {/* Calculated Amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Thành tiền
                    </label>
                    <div
                      className={`h-8 px-2.5 rounded-lg flex items-center justify-end font-mono font-extrabold text-sm border ${
                        isAdvance
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isDiscount
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isAdvance ? `-${formatVND(item.amount)}` : formatVND(item.amount)}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Classification Type Selector */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    Phân loại:
                  </span>
                  <select
                    value={item.type}
                    onChange={(e) =>
                      onUpdateItem(item.id, {
                        type: e.target.value as ItemType,
                      })
                    }
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1 outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                  >
                    <option value="work">✂️ Công may & sửa đồ</option>
                    <option value="material">🧵 Phụ liệu may</option>
                    <option value="advance">💸 Tạm ứng trước (trừ)</option>
                    <option value="discount">🎁 Giảm giá (trừ)</option>
                  </select>
                </div>
              </div>
            );
          })}

          {/* Quick Add Button at bottom of card list */}
          <button
            type="button"
            onClick={onAddItem}
            className="w-full py-3 bg-white hover:bg-blue-50/60 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl text-xs sm:text-sm font-bold text-blue-600 flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Thêm công đoạn / món mới
          </button>
        </div>
      ) : (
        /* ================= DESKTOP TABLE VIEW ================= */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-2xs">
              <tr className="text-slate-400 text-xs uppercase font-bold tracking-widest bg-slate-50/50">
                <th className="py-3 px-4 text-center w-14">STT</th>
                <th className="py-3 px-4 min-w-[200px]">Nội dung công việc</th>
                <th className="py-3 px-3 text-center w-20">SL</th>
                <th className="py-3 px-3 text-center w-20">ĐVT</th>
                <th className="py-3 px-4 text-right w-32">Đơn giá</th>
                <th className="py-3 px-4 text-right w-36">Thành tiền</th>
                <th className="py-3 px-3 text-center w-28">Phân loại</th>
                <th className="py-3 px-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item, idx) => {
                const isAdvance = item.type === 'advance';
                const isDiscount = item.type === 'discount';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isAdvance ? 'bg-rose-50/30' : isDiscount ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400 font-bold">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          onUpdateItem(item.id, { name: e.target.value })
                        }
                        className="w-full text-sm font-semibold text-slate-800 bg-transparent hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-400/50 rounded-md px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden transition-all"
                        placeholder="Tên công việc"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          onUpdateItem(item.id, {
                            quantity: qty,
                            amount: qty * item.unitPrice,
                          });
                        }}
                        className="w-14 text-center font-mono text-xs font-semibold text-slate-700 bg-transparent hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-400/50 rounded-md px-1 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden transition-all"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="text"
                        value={item.unit || 'công'}
                        onChange={(e) =>
                          onUpdateItem(item.id, { unit: e.target.value })
                        }
                        className="w-14 text-center text-xs text-slate-500 bg-transparent hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-400/50 rounded-md px-1 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden transition-all"
                        placeholder="công"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="1000"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const price = parseInt(e.target.value, 10) || 0;
                          onUpdateItem(item.id, {
                            unitPrice: price,
                            amount: item.quantity * price,
                          });
                        }}
                        className="w-24 text-right font-mono text-xs text-slate-600 font-semibold bg-transparent hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-400/50 rounded-md px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 outline-hidden transition-all"
                      />
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isAdvance
                            ? 'text-rose-600'
                            : isDiscount
                            ? 'text-indigo-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {isAdvance ? `-${formatVND(item.amount)}` : formatVND(item.amount)}
                      </span>
                    </td>

                    {/* Type Selector */}
                    <td className="py-3 px-3 text-center">
                      <select
                        value={item.type}
                        onChange={(e) =>
                          onUpdateItem(item.id, {
                            type: e.target.value as ItemType,
                          })
                        }
                        className="text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white border border-slate-200 rounded-md px-2 py-1 outline-hidden focus:ring-1 focus:ring-blue-400 cursor-pointer transition-colors"
                      >
                        <option value="work">Công may</option>
                        <option value="material">Phụ liệu</option>
                        <option value="advance">Tạm ứng</option>
                        <option value="discount">Giảm giá</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateItem(item.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                          title="Nhân đôi dòng"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
