import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

const PREMIUM_ENTITLEMENT_ID = 'premium';
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const PRODUCT_IDS = {
  MONTHLY: 'remindme_pro_monthly',
  YEARLY: 'remindme_pro_yearly',
  LIFETIME: 'remindme_pro_lifetime',
} as const;

export async function initializeRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn('[RevenueCat] No API key configured');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
}

export async function loginRevenueCat(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

export async function logoutRevenueCat(): Promise<void> {
  await Purchases.logOut();
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  cancelled?: boolean;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    return { success: isPremium, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw error;
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo: CustomerInfo;
}> {
  const customerInfo = await Purchases.restorePurchases();
  const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
  return { success: isPremium, customerInfo };
}

export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  expiresAt?: string;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];

    return {
      isPremium: entitlement !== undefined,
      expiresAt: entitlement?.expirationDate ?? undefined,
    };
  } catch {
    return { isPremium: false };
  }
}

export async function getActiveSubscription(): Promise<{
  productId?: string;
  expiresAt?: string;
  willRenew: boolean;
} | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];

    if (!entitlement) return null;

    return {
      productId: entitlement.productIdentifier,
      expiresAt: entitlement.expirationDate ?? undefined,
      willRenew: !entitlement.willRenew ? false : true,
    };
  } catch {
    return null;
  }
}

export function addCustomerInfoUpdateListener(
  callback: (info: CustomerInfo) => void
): () => void {
  const listener = Purchases.addCustomerInfoUpdateListener(callback);
  return () => listener.remove();
}
