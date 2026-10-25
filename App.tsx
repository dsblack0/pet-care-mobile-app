import React, { useState } from 'react';
import { ActivityIndicator, Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { fetchWeather, type CurrentWeather } from './src/weather';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setWeather(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Location permission denied. Enable location access in device settings.');
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setWeather(await fetchWeather(position.coords.latitude, position.coords.longitude));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.heading}>Current Weather</Text>
        <Button title={loading ? 'Loading...' : 'Get current weather'} onPress={load} disabled={loading} />
        {loading && <ActivityIndicator size="large" />}
        {error && <Text style={styles.error}>{error}</Text>}
        {weather && (
          <View style={styles.card}>
            <Text style={styles.temperature}>{weather.temperature}°F</Text>
            <Text style={styles.condition}>{weather.condition}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, gap: 20 },
  heading: { fontSize: 26, fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 14, alignItems: 'center', gap: 10 },
  temperature: { fontSize: 48, fontWeight: '700' },
  condition: { fontSize: 20 },
  error: { color: '#b91c1c' },
});
