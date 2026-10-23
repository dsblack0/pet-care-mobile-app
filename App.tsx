import { useEffect, useState } from 'react';
import { Button, Platform, SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import Purchases from 'react-native-purchases';

// Replace locally, never commit real values.
const GOOGLE_MAPS_KEY = '';

// Test Store keys start with "test_". Swap in the real iOS and Android public
// keys here when you move to App Store Connect and Play Console, and never
// ship a build that uses a Test Store key.
const REVENUECAT_KEY = Platform.select({
  ios: '',
  android: '',
});

// Must match the entitlement identifier in the RevenueCat dashboard
const ENTITLEMENT_ID = '443_project_pro';
interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}
 
interface GeocodeResponse {
  status: string;
  results: GeocodeResult[];
  error_message?: string;
}
 
// Google Geocoding API (address -> coordinates)
async function geocode(address: string): Promise<GeocodeResponse> {
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
  const response = await fetch(url);
  return response.json();
}
 
const hasPremium = (customerInfo: CustomerInfo): boolean =>
  customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
 
export default function App() {
  const [mapOutput, setMapOutput] = useState<string>('Press the button');
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [billingMessage, setBillingMessage] = useState<string>('Loading...');
 
  useEffect(() => {
    const loadBilling = async () => {
      try {
        Purchases.configure({ apiKey: REVENUECAT_KEY });
 
        const offerings = await Purchases.getOfferings();
        const firstPackage = offerings.current?.availablePackages[0] ?? null;
        setPkg(firstPackage);
        setBillingMessage(
          firstPackage
            ? `${firstPackage.product.title} - ${firstPackage.product.priceString}`
            : 'No package found in the current offering'
        );
 
        const customerInfo = await Purchases.getCustomerInfo();
        setIsPremium(hasPremium(customerInfo));
      } catch (error) {
        const purchasesError = error as PurchasesError;
        setBillingMessage(purchasesError.message ?? JSON.stringify(error));
      }
    };
    loadBilling();
  }, []);
 
  const handleGeocode = async () => {
    try {
      const data = await geocode('1600 Amphitheatre Parkway, Mountain View, CA');
      const first = data.results[0];
      setMapOutput(
        first
          ? `${first.formatted_address}\n${first.geometry.location.lat}, ${first.geometry.location.lng}`
          : `Status: ${data.status}\n${data.error_message ?? ''}`
      );
    } catch (error) {
      setMapOutput(String(error));
    }
  };
 
  const handleBuy = async () => {
    if (!pkg) {
      return;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setIsPremium(hasPremium(customerInfo));
      console.log(Object.keys(customerInfo.entitlements.active));
    } catch (error) {
      const purchasesError = error as PurchasesError;
      if (!purchasesError.userCancelled) {
        setBillingMessage(purchasesError.message ?? JSON.stringify(error));
      }
    }
  };
 
  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      setIsPremium(hasPremium(customerInfo));
    } catch (error) {
      const purchasesError = error as PurchasesError;
      setBillingMessage(purchasesError.message ?? JSON.stringify(error));
    }
  };
 
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Google Maps Geocoding</Text>
        <Button title="Geocode an address" onPress={handleGeocode} />
        <Text style={styles.line}>{mapOutput}</Text>
 
        <Text style={styles.heading}>RevenueCat Test Store</Text>
        <Text style={styles.line}>{billingMessage}</Text>
        <Text style={styles.line}>Premium: {isPremium ? 'active' : 'inactive'}</Text>
        <Button title="Buy" onPress={handleBuy} disabled={!pkg} />
        <Button title="Restore purchases" onPress={handleRestore} />
      </ScrollView>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, paddingTop: 64 },
  heading: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12 },
  line: { marginVertical: 12 },
});
 