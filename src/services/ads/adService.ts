import mobileAds, { MaxAdContentRating, InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const INTERSTITIAL_AD_UNIT = __DEV__
  ? TestIds.INTERSTITIAL
  : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? TestIds.INTERSTITIAL);

const BANNER_AD_UNIT = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? TestIds.BANNER);

let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;

export async function initializeAds(): Promise<void> {
  await mobileAds().initialize();
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
  });

  preloadInterstitial();
}

function preloadInterstitial(): void {
  interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT);

  interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
    isInterstitialLoaded = true;
  });

  interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    isInterstitialLoaded = false;
    // Preload next one
    preloadInterstitial();
  });

  interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.error('[Ads] Interstitial error:', error);
    isInterstitialLoaded = false;
  });

  interstitialAd.load();
}

export async function showInterstitialAd(): Promise<boolean> {
  if (!isInterstitialLoaded || !interstitialAd) {
    return false;
  }

  try {
    interstitialAd.show();
    return true;
  } catch {
    return false;
  }
}

export function getBannerAdUnitId(): string {
  return BANNER_AD_UNIT;
}
