import React, { useState } from 'react';
import { Store as StoreIcon, Plus, Edit, Trash2, Check, X, MapPin, Star, Utensils, Tag, Image as ImageIcon } from 'lucide-react';
import { Store, MenuItem } from '../../types';

interface Props {
  storesList: Store[];
  onCreateStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  onCreateMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (storeId: string, itemId: string) => void;
}

export const AdminStoresTab: React.FC<Props> = ({
  storesList,
  onCreateStore,
  onUpdateStore,
  onDeleteStore,
  onCreateMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem
}) => {
  const [selectedStoreForMenu, setSelectedStoreForMenu] = useState<Store | null>(null);

  // Store Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('مطعم');
  const [storeDeliveryTime, setStoreDeliveryTime] = useState('25 - 35 دقيقة');
  const [storeDeliveryFee, setStoreDeliveryFee] = useState('15');
  const [storeMinOrder, setStoreMinOrder] = useState('0');
  const [storeAddress, setStoreAddress] = useState('القاهرة');
  const [storeImage, setStoreImage] = useState('');
  const [storeBanner, setStoreBanner] = useState('');
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [storeIsFeatured, setStoreIsFeatured] = useState(false);

  // Menu Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemOriginalPrice, setItemOriginalPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('الرئيسية');
  const [itemImage, setItemImage] = useState('');
  const [itemIsPopular, setItemIsPopular] = useState(false);

  const openNewStoreModal = () => {
    setEditingStore(null);
    setStoreName('');
    setStoreCategory('مطعم');
    setStoreDeliveryTime('25 - 35 دقيقة');
    setStoreDeliveryFee('15');
    setStoreMinOrder('0');
    setStoreAddress('القاهرة');
    setStoreImage('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80');
    setStoreBanner('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80');
    setStoreIsOpen(true);
    setStoreIsFeatured(false);
    setIsStoreModalOpen(true);
  };

  const openEditStoreModal = (store: Store) => {
    setEditingStore(store);
    setStoreName(store.name);
    setStoreCategory(store.category);
    setStoreDeliveryTime(store.deliveryTime);
    setStoreDeliveryFee(store.deliveryFee.toString());
    setStoreMinOrder(store.minOrder.toString());
    setStoreAddress(store.address || 'القاهرة');
    setStoreImage(store.image);
    setStoreBanner(store.banner);
    setStoreIsOpen(store.isOpen !== false);
    setStoreIsFeatured(store.isFeatured || false);
    setIsStoreModalOpen(true);
  };

  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    if (editingStore) {
      const updated: Store = {
        ...editingStore,
        name: storeName.trim(),
        category: storeCategory,
        deliveryTime: storeDeliveryTime,
        deliveryFee: parseFloat(storeDeliveryFee) || 0,
        minOrder: parseFloat(storeMinOrder) || 0,
        address: storeAddress,
        image: storeImage || editingStore.image,
        banner: storeBanner || editingStore.banner,
        isOpen: storeIsOpen,
        isFeatured: storeIsFeatured
      };
      onUpdateStore(updated);
      if (selectedStoreForMenu?.id === updated.id) {
        setSelectedStoreForMenu(updated);
      }
    } else {
      const newStore: Store = {
        id: 'str-' + Date.now(),
        name: storeName.trim(),
        category: storeCategory,
        rating: 5.0,
        reviewsCount: 1,
        deliveryTime: storeDeliveryTime,
        deliveryFee: parseFloat(storeDeliveryFee) || 15,
        minOrder: parseFloat(storeMinOrder) || 0,
        distance: '1.0 كم',
        address: storeAddress,
        tags: [storeCategory, 'جديد'],
        image: storeImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
        banner: storeBanner || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        isOpen: storeIsOpen,
        isFeatured: storeIsFeatured,
        items: []
      };
      onCreateStore(newStore);
    }
    setIsStoreModalOpen(false);
  };

  const openNewItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemDesc('');
    setItemPrice('');
    setItemOriginalPrice('');
    setItemCategory('الرئيسية');
    setItemImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80');
    setItemIsPopular(false);
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description || '');
    setItemPrice(item.price.toString());
    setItemOriginalPrice(item.originalPrice ? item.originalPrice.toString() : '');
    setItemCategory(item.category || 'الرئيسية');
    setItemImage(item.image);
    setItemIsPopular(item.isPopular || false);
    setIsItemModalOpen(true);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreForMenu || !itemName.trim() || !itemPrice) return;

    if (editingItem) {
      const updated: MenuItem = {
        ...editingItem,
        storeId: selectedStoreForMenu.id,
        name: itemName.trim(),
        description: itemDesc.trim(),
        price: parseFloat(itemPrice) || 0,
        originalPrice: itemOriginalPrice ? parseFloat(itemOriginalPrice) : undefined,
        category: itemCategory,
        image: itemImage || editingItem.image,
        isPopular: itemIsPopular
      };
      onUpdateMenuItem(updated);
    } else {
      const newItem: MenuItem = {
        id: 'item-' + Date.now(),
        storeId: selectedStoreForMenu.id,
        name: itemName.trim(),
        description: itemDesc.trim(),
        price: parseFloat(itemPrice) || 0,
        originalPrice: itemOriginalPrice ? parseFloat(itemOriginalPrice) : undefined,
        category: itemCategory,
        image: itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        isPopular: itemIsPopular
      };
      onCreateMenuItem(newItem);
    }
    setIsItemModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-orange-400" />
            إدارة المتاجر والمطاعم وقوائم الطعام ({storesList.length})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وتعديل وحذف المتاجر والوجبات مع حفظ تلقائي في قاعدة البيانات Supabase.
          </p>
        </div>

        <button
          onClick={openNewStoreModal}
          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة متجر جديد</span>
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {storesList.map((store) => (
          <div
            key={store.id}
            className={`bg-slate-800 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
              selectedStoreForMenu?.id === store.id ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-slate-700'
            }`}
          >
            <div>
              {/* Image & Banner Preview */}
              <div className="relative h-28 bg-slate-900 overflow-hidden">
                <img src={store.banner || store.image} alt={store.name} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  <img src={store.image} alt={store.name} className="w-10 h-10 rounded-xl object-cover border-2 border-slate-800 shadow" />
                  <div>
                    <h4 className="font-bold text-sm text-white">{store.name}</h4>
                    <span className="text-[10px] text-amber-400 bg-slate-900/80 px-2 py-0.5 rounded-md font-bold">
                      {store.category}
                    </span>
                  </div>
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${store.isOpen !== false ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                    {store.isOpen !== false ? 'مفتوح' : 'مغلق'}
                  </span>
                </div>
              </div>

              {/* Store Details */}
              <div className="p-3 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-orange-400" /> {store.address || 'القاهرة'}</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {store.rating} ({store.reviewsCount})</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>التوصيل: <strong className="text-white">{store.deliveryFee} ج.م</strong></span>
                  <span>الوقت: <strong className="text-white">{store.deliveryTime}</strong></span>
                </div>
                <div className="text-slate-400">
                  <span>عدد الأطعمة والوجبات: <strong className="text-amber-300 font-bold">{store.items?.length || 0} منتج</strong></span>
                </div>
              </div>
            </div>

            {/* Store Card Actions */}
            <div className="p-3 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedStoreForMenu(store)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedStoreForMenu?.id === store.id ? 'bg-orange-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>إدارة المنيو ({store.items?.length || 0})</span>
              </button>

              <button
                onClick={() => openEditStoreModal(store)}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 p-2 rounded-xl transition-all"
                title="تعديل المتجر"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (confirm(`هل أنت متاكد من حذف متجر "${store.name}" وقائمة أطعمته نهائياً؟`)) {
                    onDeleteStore(store.id);
                    if (selectedStoreForMenu?.id === store.id) {
                      setSelectedStoreForMenu(null);
                    }
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-xl transition-all"
                title="حذف المتجر"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Store Menu Items Management */}
      {selectedStoreForMenu && (
        <div className="bg-slate-800 p-5 rounded-2xl border border-orange-500/50 space-y-4 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
            <div>
              <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-400" />
                قائمة طعام متجر: <span className="text-amber-300">{selectedStoreForMenu.name}</span>
              </h4>
              <p className="text-xs text-slate-400">
                إضافة وتعديل المنتجات المعروضة للعملاء في هذا المتجر.
              </p>
            </div>

            <button
              onClick={openNewItemModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف / وجبة جديدة</span>
            </button>
          </div>

          {!selectedStoreForMenu.items || selectedStoreForMenu.items.length === 0 ? (
            <div className="bg-slate-900/60 p-6 rounded-xl text-center text-slate-400 text-xs border border-slate-700/50">
              لا توجد أصناف مضافة حالياً في هذا المتجر. اضغط "إضافة صنف / وجبة جديدة" لإضافة وجبة.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {selectedStoreForMenu.items.map((item) => (
                <div key={item.id} className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-2">
                  <div className="space-y-2">
                    <div className="relative h-24 rounded-lg overflow-hidden bg-slate-800">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      {item.isPopular && (
                        <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md shadow">
                          الأكثر طلباً ⭐
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white line-clamp-1">{item.name}</h5>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-emerald-400 font-extrabold text-xs">{item.price} ج.م</span>
                        {item.originalPrice && (
                          <span className="text-slate-500 line-through text-[10px]">{item.originalPrice} ج.م</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      {item.category || 'الرئيسية'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 p-1.5 rounded-lg text-xs"
                        title="تعديل الوجبة"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متاكد من حذف وجبة "${item.name}"؟`)) {
                            onDeleteMenuItem(selectedStoreForMenu.id, item.id);
                          }
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg text-xs"
                        title="حذف الوجبة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Store Modal (Create / Edit) */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-orange-400" />
                {editingStore ? `تعديل بيانات متجر: ${editingStore.name}` : 'إضافة متجر جديد'}
              </h4>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم المتجر / المطعم *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: كافيه السلطان"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">التصنيف</label>
                  <select
                    value={storeCategory}
                    onChange={(e) => setStoreCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="مطعم">مطعم</option>
                    <option value="كافيه">كافيه</option>
                    <option value="سوبر ماركت">سوبر ماركت</option>
                    <option value="صيدلية">صيدلية</option>
                    <option value="حلويات">حلويات</option>
                    <option value="مخبز">مخبز</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">وقت التوصيل المتوقع</label>
                  <input
                    type="text"
                    value={storeDeliveryTime}
                    onChange={(e) => setStoreDeliveryTime(e.target.value)}
                    placeholder="25 - 35 دقيقة"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">رسوم التوصيل (ج.م)</label>
                  <input
                    type="number"
                    value={storeDeliveryFee}
                    onChange={(e) => setStoreDeliveryFee(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">الحد الأدنى للطلب (ج.م)</label>
                  <input
                    type="number"
                    value={storeMinOrder}
                    onChange={(e) => setStoreMinOrder(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">العنوان والمنطقة</label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="القاهرة - شارع النصر"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">رابط صورة المتجر (Logo URL)</label>
                <input
                  type="text"
                  value={storeImage}
                  onChange={(e) => setStoreImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">رابط بنر المتجر (Banner URL)</label>
                <input
                  type="text"
                  value={storeBanner}
                  onChange={(e) => setStoreBanner(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeIsOpen}
                    onChange={(e) => setStoreIsOpen(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-orange-600 focus:ring-0"
                  />
                  <span className="text-white font-bold">المتجر مفتوح ومتاح للطلبات الآن</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeIsFeatured}
                    onChange={(e) => setStoreIsFeatured(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-orange-600 focus:ring-0"
                  />
                  <span className="text-amber-300 font-bold">عرض كمتجر مميز ⭐</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Item Modal (Create / Edit) */}
      {isItemModalOpen && selectedStoreForMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-400" />
                {editingItem ? `تعديل وجبة: ${editingItem.name}` : `إضافة صنف جديد لمتجر ${selectedStoreForMenu.name}`}
              </h4>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم الوجبة / الصنف *</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="مثال: برجر دجاج كلاسيك"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">وصف الوجبة والمكونات</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="مثال: قطع دجاج مقرمش مع بطاطس وصوص طازج"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">السعر بعد الخصم (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="85"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">السعر الأصلي قبل الخصم (اختياري)</label>
                  <input
                    type="number"
                    value={itemOriginalPrice}
                    onChange={(e) => setItemOriginalPrice(e.target.value)}
                    placeholder="110"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">تصنيف الوجبة</label>
                  <input
                    type="text"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    placeholder="الرئيسية / مشروبات / حلويات"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">رابط الصورة (Image URL)</label>
                  <input
                    type="text"
                    value={itemImage}
                    onChange={(e) => setItemImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemIsPopular}
                    onChange={(e) => setItemIsPopular(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-amber-300 font-bold">تحديد كوجبة مميزة وأكثر طلباً ⭐</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl shadow"
                >
                  حفظ الوجبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
