export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  passwordHash?: string;
  pin?: string;
  pinHash?: string;
  role: 'customer' | 'driver' | 'merchant' | 'admin';
  status: 'active' | 'suspended';
  rating?: number;
  totalRatings?: number;
  vehicleType?: string;
  storeId?: string;
  lastPinVerifiedMs?: number;
  isVerifiedCustomer?: boolean;
  verificationDocs?: {
    idFrontUrl?: string;
    idBackUrl?: string;
    status: 'none' | 'pending' | 'approved' | 'rejected';
    rejectReason?: string;
  };
  completedOrdersCount?: number;
  isAdminMain?: boolean;
  adminPermissions?: string[]; // e.g. ['orders', 'users', 'stores', 'coupons', 'settings']
  adminPhotoUrl?: string;
  lastActiveTime?: string;
  sessionDuration?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  createdAt: string;
}

export interface Complaint {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  category: 'missing_items' | 'wrong_item' | 'driver_issue' | 'delay' | 'store_issue' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  adminResponse?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  details?: string;
  canRevert?: boolean;
  reverted?: boolean;
  createdAt: string;
}

export interface TrustedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  browser: string;
  platform: string;
  lastActive: string;
}

export interface AdBanner {
  id: string;
  imageUrl: string;
  title: string;
  targetUrl?: string;
  placement?: 'home_top' | 'home_middle' | 'stores_list' | 'footer';
  badge?: string;
  active: boolean;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
  x?: string;
  youtube?: string;
  telegram?: string;
}

export interface TelegramSettings {
  botToken?: string;
  chatId?: string;
  notifyOrders?: boolean;
  notifyDrivers?: boolean;
  notifyBackups?: boolean;
}

export interface SiteSettings {
  siteName: string;
  slogan?: string;
  supportPhone: string;
  logoUrl: string;
  bannerOfferText: string;
  deliveryBaseFee: number;
  driverCommissionPercent?: number;
  merchantCommissionPercent?: number;
  adBanners?: AdBanner[];
  socialLinks?: SocialLinks;
  telegramSettings?: TelegramSettings;
}

export interface OrderRating {
  driverRating?: number;
  driverReview?: string;
  storeRating?: number;
  storeReview?: string;
  customerRatingByDriver?: number;
  customerReviewByDriver?: string;
}

export interface MerchantApplication {
  id: string;
  storeName: string;
  businessType: string;
  customBusinessType?: string;
  ownerName: string;
  phone: string;
  hasWhatsapp?: boolean;
  city: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DriverApplication {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: string; // e.g. 'موتوسيكل / سكوتر' | 'دراجة هوائية' | 'مشياً علي الأقدام'
  vehicleBrand?: string;
  vehicleModel?: string;
  plateNumber?: string;
  noLicense: boolean;
  personalPhotoUrl?: string;
  driverLicenseUrl?: string;
  vehicleLicenseUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  docStatus?: {
    personalPhoto?: 'approved' | 'rejected' | 'pending';
    driverLicense?: 'approved' | 'rejected' | 'pending';
    vehicleLicense?: 'approved' | 'rejected' | 'pending';
    plateNumber?: 'approved' | 'rejected' | 'pending';
  };
  rejectionReason?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  color: string;
}

export interface MenuItemOption {
  name: string;
  price: number;
}

export interface MenuItemOptionGroup {
  id: string;
  title: string;
  required: boolean;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating?: number;
  isPopular?: boolean;
  optionGroups?: MenuItemOptionGroup[];
}

export interface Store {
  id: string;
  name: string;
  category: string; // 'restaurants' | 'supermarket' | 'pharmacy' | 'veggies' | 'sweets' | 'errands'
  rating: number;
  reviewsCount: number;
  deliveryTime: string; // e.g., '25 - 35 دقيقة'
  deliveryFee: number; // in EGP
  minOrder: number;
  image: string;
  banner: string;
  isFeatured?: boolean;
  isOpen: boolean;
  distance: string;
  address: string;
  tags: string[];
  items: MenuItem[];
}

export interface CartItemOption {
  groupTitle: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  uniqueId: string;
  item: MenuItem;
  storeName: string;
  storeId: string;
  quantity: number;
  selectedOptions: CartItemOption[];
  specialNotes?: string;
}

export type OrderStatus = 'received' | 'sent' | 'preparing' | 'driver_assigned' | 'arrived_store' | 'picked_up' | 'arrived_customer' | 'delivered' | 'cancelled';
export type DriverStep = 'accepted' | 'going_to_store' | 'at_store_received' | 'going_to_customer' | 'delivered';

export interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  isWassalni?: boolean;
  wassalniDetails?: {
    itemDescription: string;
    pickupAddress: string;
    dropoffAddress: string;
    minFee: number;
    userTip: number;
  };
  deliveryAddress: {
    street: string;
    building: string;
    floor: string;
    apartment?: string;
    landmark?: string;
    phone: string;
    notes?: string;
    gpsCoords?: string;
  };
  paymentMethod: 'cash' | 'vodafone_cash' | 'card';
  paymentPaidOnline: boolean;
  estimatedMinutes: number;
  driverId?: string;
  driverStep?: DriverStep;
  storeDistance?: string;
  customerDistance?: string;
  driverDeliveryFeeCollected?: number;
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  driver?: {
    id?: string;
    name: string;
    phone: string;
    vehicle: string;
    plateNumber?: string;
    rating: number;
    avatar: string;
  };
  ratings?: OrderRating;
}

export interface UserAddress {
  id: string;
  title: string; // e.g., 'المنزل', 'العمل'
  street: string;
  building: string;
  floor: string;
  phone: string;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface Notification {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecord {
  id?: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  role?: string;
  userAgent?: string;
  createdAt?: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  orderStatusAlerts: boolean;
  promotionsAlerts: boolean;
  religiousRemindersEnabled: boolean;
  religiousReminderIntervalMinutes: number; // e.g. 5, 10, 15, 20, 25, 30
}

export interface SendPushPayload {
  userId?: string;
  userIds?: string[];
  role?: 'customer' | 'driver' | 'merchant' | 'admin' | 'all';
  title: string;
  body: string;
  message?: string;
  url?: string;
  orderId?: string;
  type?: 'order' | 'driver' | 'merchant' | 'admin' | 'system' | 'reminder';
  image?: string;
  isReligious?: boolean;
  requireInteraction?: boolean;
}


