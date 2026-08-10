import React, { useState } from 'react';
import { Store, MenuItem, CartItemOption } from '../types';
import { X, Star, Clock, Bike, MapPin, Plus, Check, Search, Sparkles, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  store: Store | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedOptions: CartItemOption[], specialNotes: string) => void;
}

export const StoreDetailsModal: React.FC<Props> = ({ store, onClose, onAddToCart }) => {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  if (!store) return null;

  // Filter items
  const filteredItems = store.items.filter((item) => {
    const matchesCategory = activeCategoryTab === 'all' || item.category === activeCategoryTab;
    const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', ...Array.from(new Set(store.items.map((i) => i.category)))];

  const handleOpenItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSpecialNotes('');
    // Default required options if any
    const defaultOpts: CartItemOption[] = [];
    if (item.optionGroups) {
      item.optionGroups.forEach((group) => {
        if (group.required && group.options.length > 0) {
          defaultOpts.push({
            groupTitle: group.title,
            optionName: group.options[0].name,
            price: group.options[0].price
          });
        }
      });
    }
    setSelectedOptions(defaultOpts);
  };

  const toggleOption = (groupTitle: string, optionName: string, price: number, isRequired: boolean) => {
    if (isRequired) {
      // Replace existing choice in this required group
      const otherGroups = selectedOptions.filter((opt) => opt.groupTitle !== groupTitle);
      setSelectedOptions([...otherGroups, { groupTitle, optionName, price }]);
    } else {
      // Toggle choice
      const exists = selectedOptions.some((opt) => opt.groupTitle === groupTitle && opt.optionName === optionName);
      if (exists) {
        setSelectedOptions(selectedOptions.filter((opt) => !(opt.groupTitle === groupTitle && opt.optionName === optionName)));
      } else {
        setSelectedOptions([...selectedOptions, { groupTitle, optionName, price }]);
      }
    }
  };

  const calculateTotalPrice = (item: MenuItem) => {
    const optionsTotal = selectedOptions.reduce((acc, curr) => acc + curr.price, 0);
    return item.price + optionsTotal;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="bg-white w-full max-w-3xl h-full sm:h-[90vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* Header Banner */}
          <div className="relative h-48 sm:h-56 w-full shrink-0">
            <img src={store.banner} alt={store.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 bg-slate-900/60 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Store Name & Meta on Banner */}
            <div className="absolute bottom-4 right-4 left-4 text-white">
              <div className="flex items-center gap-2">
                <span className="bg-orange-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  {store.category === 'restaurants' ? 'مطعم' : 'متجر'}
                </span>
                <span className="text-xs text-slate-200 font-medium flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {store.rating}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-1">{store.name}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  {store.deliveryTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-orange-400" />
                  توصيل حسب المسافة • بدون حد أدنى
                </span>
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="ابحث داخل قائمة المتجر..."
                className="w-full bg-white text-xs font-medium pr-10 pl-4 py-2 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryTab(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategoryTab === cat
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'all' ? 'جميع المأكولات' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">لم نجد أصنافاً تطابق بحثك في هذا المتجر.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 hover:border-orange-200 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h4>
                      {item.isPopular && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                          الأكثر طلباً
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-black text-sm text-slate-900">{item.price} ج.م</span>
                      {item.originalPrice && (
                        <span className="text-xs text-slate-400 line-through font-normal">
                          {item.originalPrice} ج.م
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <button className="absolute bottom-1.5 left-1.5 bg-orange-600 hover:bg-orange-700 text-white p-1.5 rounded-lg shadow-md transition-all active:scale-90">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Item Customization Modal Overlay */}
          {selectedItem && (
            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="relative h-44 w-full shrink-0">
                  <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute right-3 top-3 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">{selectedItem.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{selectedItem.description}</p>
                    <span className="inline-block mt-2 font-black text-base text-orange-600">
                      السعر الأساسي: {selectedItem.price} ج.م
                    </span>
                  </div>

                  {/* Option Groups */}
                  {selectedItem.optionGroups?.map((group) => (
                    <div key={group.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900">{group.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {group.required ? 'إجباري' : 'اختياري'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.options.map((opt, idx) => {
                          const isSelected = selectedOptions.some(
                            (o) => o.groupTitle === group.title && o.optionName === opt.name
                          );
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleOption(group.title, opt.name, opt.price, group.required)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border ${
                                isSelected
                                  ? 'bg-orange-50 border-orange-500 text-orange-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                  isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <span>{opt.name}</span>
                              </div>
                              <span>{opt.price > 0 ? `+${opt.price} ج.م` : 'مجاناً'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Special Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظات خاصة للوجبة (اختياري):
                    </label>
                    <input
                      type="text"
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      placeholder="مثال: بدون كاتشب، زيادة ثومية، إلخ..."
                      className="w-full bg-slate-50 text-xs p-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Footer Add Button */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">الإجمالي:</span>
                    <span className="font-extrabold text-lg text-slate-900">
                      {calculateTotalPrice(selectedItem)} ج.م
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onAddToCart(selectedItem, selectedOptions, specialNotes);
                      setSelectedItem(null);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة إلى السلة
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
