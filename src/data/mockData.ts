import { Category, Store } from '../types';

export const categories: Category[] = [
  { id: 'all', name: 'الكل', icon: 'LayoutGrid', color: 'bg-slate-100 text-slate-800' },
  { id: 'restaurants', name: 'مطاعم', icon: 'UtensilsCrossed', badge: 'أقوى العروض', color: 'bg-orange-100 text-orange-700' },
  { id: 'supermarket', name: 'سوبر ماركت', icon: 'ShoppingCart', badge: 'توصيل 20 د', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'pharmacy', name: 'صيدلية', icon: 'Pill', color: 'bg-blue-100 text-blue-700' },
  { id: 'veggies', name: 'خضروات وفواكه', icon: 'Apple', badge: 'طازجة يومياً', color: 'bg-green-100 text-green-700' },
  { id: 'sweets', name: 'حلويات ومخبوزات', icon: 'Cake', color: 'bg-pink-100 text-pink-700' },
  { id: 'errands', name: 'مشاوير / وصل لي', icon: 'Bike', badge: 'خدمة خاصة', color: 'bg-purple-100 text-purple-700' },
];

export const stores: Store[] = [
  {
    id: 'store-1',
    name: 'مطعم كرم الشام - البرجر والسوري',
    category: 'restaurants',
    rating: 4.8,
    reviewsCount: 1240,
    deliveryTime: '20 - 30 دقيقة',
    deliveryFee: 15,
    minOrder: 50,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    isFeatured: true,
    isOpen: true,
    distance: '1.2 كم',
    address: 'شارع الحرية - وسط البلد',
    tags: ['شاورما', 'برجر', 'وجبات سريعة'],
    items: [
      {
        id: 'item-101',
        storeId: 'store-1',
        name: 'ساندوتش شاورما دجاج سوبر صاروخ',
        description: 'شاورما دجاج بلدي مع الثومية المتميزة والخيار المخلل والبطاطس المحمرة.',
        price: 85,
        originalPrice: 100,
        image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=80',
        category: 'شاورما',
        rating: 4.9,
        isPopular: true,
        optionGroups: [
          {
            id: 'size',
            title: 'الحجم',
            required: true,
            options: [
              { name: 'عادي (صاروخ)', price: 0 },
              { name: 'جامبو عائلي (+ 25 ج.م)', price: 25 }
            ]
          },
          {
            id: 'extras',
            title: 'إضافات مميزة',
            required: false,
            options: [
              { name: 'جبنة موزاريلا سايحة', price: 15 },
              { name: 'ثومية زياد', price: 10 },
              { name: 'بطاطس إضافية داخل الساندوتش', price: 10 }
            ]
          }
        ]
      },
      {
        id: 'item-102',
        storeId: 'store-1',
        name: 'وجبة كرم الشام المشكلة (عائلي)',
        description: 'قطع شاورما دجاج ولحم + ثومية + بطاطس فارم فريتس + خبز صاج + طرشي بلدي.',
        price: 240,
        originalPrice: 280,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
        category: 'وجبات',
        rating: 4.8,
        isPopular: true
      },
      {
        id: 'item-103',
        storeId: 'store-1',
        name: 'برجر كلاسيك دبل تشيز',
        description: 'شريحتين لحم بلدي 200 جرام مع جبنة شيدر أمريكي وصوص الخاص.',
        price: 135,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
        category: 'برجر',
        rating: 4.7
      }
    ]
  },
  {
    id: 'store-2',
    name: 'سوبر ماركت خير زمان المباشر',
    category: 'supermarket',
    rating: 4.7,
    reviewsCount: 890,
    deliveryTime: '15 - 25 دقيقة',
    deliveryFee: 10,
    minOrder: 40,
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80',
    isFeatured: true,
    isOpen: true,
    distance: '0.8 كم',
    address: 'شارع الجمهورية - أمام الجامعة',
    tags: ['ألبان', 'مشروبات', 'منتجات منزلية'],
    items: [
      {
        id: 'item-201',
        storeId: 'store-2',
        name: 'لبن لمار كامل الدسم 1 ليتر',
        description: 'حليب طبيعي 100% مبستر وصحي للأسرة.',
        price: 48,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80',
        category: 'ألبان ومشروبات',
        rating: 4.9,
        isPopular: true
      },
      {
        id: 'item-202',
        storeId: 'store-2',
        name: 'جبنة بيضاء دومتي بلس 500 جرام',
        description: 'جبنة طازجة طعم غني وممتاز.',
        price: 38,
        image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=80',
        category: 'جبن وألبان',
        rating: 4.8
      },
      {
        id: 'item-203',
        storeId: 'store-2',
        name: 'زيت عباد الشمس كريستال 800 مل',
        description: 'زيت نقي خفيف للطبخ والقلي.',
        price: 82,
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
        category: 'زيوت ومواد غذائية',
        rating: 4.9
      }
    ]
  },
  {
    id: 'store-3',
    name: 'بيتزا وحواوشي السلطان',
    category: 'restaurants',
    rating: 4.6,
    reviewsCount: 650,
    deliveryTime: '25 - 40 دقيقة',
    deliveryFee: 15,
    minOrder: 60,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80',
    isFeatured: false,
    isOpen: true,
    distance: '2.1 كم',
    address: 'شارع النصر - النزهة',
    tags: ['بيتزا', 'حواوشي', 'مشويات'],
    items: [
      {
        id: 'item-301',
        storeId: 'store-3',
        name: 'بيتزا سوبر سوبريم إيطالي',
        description: 'بسطرمة، سوسيس، سلامي، خضروات طازجة، زيتون، وجبنة موزاريلا عالية الجودة.',
        price: 160,
        originalPrice: 190,
        image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=500&q=80',
        category: 'بيتزا',
        rating: 4.8,
        isPopular: true
      },
      {
        id: 'item-302',
        storeId: 'store-3',
        name: 'حواوشي السلطان بالجبنة والفسدق',
        description: 'رغيف خبز بلدي مليء باللحم البلدي المتبل مع الجبنة الموزاريلا الفاخرة.',
        price: 75,
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80',
        category: 'حواوشي',
        rating: 4.9
      }
    ]
  },
  {
    id: 'store-4',
    name: 'صيدلية العزبي السريعة 24 ساعة',
    category: 'pharmacy',
    rating: 4.9,
    reviewsCount: 1500,
    deliveryTime: '15 - 20 دقيقة',
    deliveryFee: 10,
    minOrder: 30,
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=1200&q=80',
    isFeatured: true,
    isOpen: true,
    distance: '0.5 كم',
    address: 'شارع السلام - بجوار المستشفى',
    tags: ['أدوية', 'مستلزمات أطفال', 'عناية شخصية'],
    items: [
      {
        id: 'item-401',
        storeId: 'store-4',
        name: 'بندول أدفانس تسكين سريع (24 قرص)',
        description: 'مسكن للآلام والصداع وخافض للحرارة سريع المفعول.',
        price: 42,
        image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
        category: 'أدوية ومسكنات',
        rating: 5.0,
        isPopular: true
      },
      {
        id: 'item-402',
        storeId: 'store-4',
        name: 'حفاضات أطفال بامبرز كلوت مقاس 4 (58 حفاضة)',
        description: 'حماية متكاملة وجفاف يدوم 12 ساعة.',
        price: 320,
        image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=500&q=80',
        category: 'عناية بالأطفال',
        rating: 4.8
      }
    ]
  },
  {
    id: 'store-5',
    name: 'حلواني وخباز العبد الأصلي',
    category: 'sweets',
    rating: 4.9,
    reviewsCount: 2100,
    deliveryTime: '25 - 35 دقيقة',
    deliveryFee: 15,
    minOrder: 50,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    banner: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
    isFeatured: true,
    isOpen: true,
    distance: '1.8 كم',
    address: 'شارع سعد زغلول',
    tags: ['شرقي', 'غربي', 'تورت', 'مخبوزات'],
    items: [
      {
        id: 'item-501',
        storeId: 'store-5',
        name: 'علبة مشكل حلويات شرقية بالسمن البلدي (1 كجم)',
        description: 'بسبوسة، كنافة أسورة، بقلاوة مكسرات، وهريسة ملوكي.',
        price: 220,
        originalPrice: 250,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
        category: 'حلويات شرقية',
        rating: 4.9,
        isPopular: true
      },
      {
        id: 'item-502',
        storeId: 'store-5',
        name: 'تورتة نوتيلا ولوتس فرينش شيكولاته',
        description: 'كيك شوكولاتة هشة محشوة بكريمة النوتيلا ومغطاة بفرنش اللوتس.',
        price: 290,
        image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=500&q=80',
        category: 'تورت وجاتوه',
        rating: 4.9
      }
    ]
  }
];

export const initialOffersBanner = [
  {
    id: 'banner-1',
    title: 'تخصيم 30% على أول طلب!',
    subtitle: 'استخدم كود: TALABAK30 واصلك أسرع دليفري',
    bgColor: 'from-orange-600 via-orange-500 to-amber-500',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'banner-2',
    title: 'توصيل مجاني من السوبرماركت',
    subtitle: 'للطلبات الأكبر من 150 جنيه طوال هذا الأسبوع',
    bgColor: 'from-emerald-600 via-emerald-500 to-teal-500',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'
  }
];
