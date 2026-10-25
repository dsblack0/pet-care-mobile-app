import { z } from 'zod';

// Request only the two API values needed for the display.
export const WeatherResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number(),
  }),
});
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
export type CurrentWeather = { temperature: number; condition: string };

export function makeWeatherUrl(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Invalid coordinates');
  }
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
    temperature_unit: 'fahrenheit',
  });
  return `https://api.open-meteo.com/v1/forecast?${query.toString()}`;
}

export function describeWeather(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Unknown conditions';
}

export async function fetchWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
  const response = await fetch(makeWeatherUrl(latitude, longitude));
  if (!response.ok) throw new Error(`Weather API returned HTTP ${response.status}`);
  const raw: unknown = await response.json();
  const parsed = WeatherResponseSchema.parse(raw);
  return {
    temperature: Math.round(parsed.current.temperature_2m),
    condition: describeWeather(parsed.current.weather_code),
  };
}
