# Current Weather API Test

A standalone Expo app that shows **only the current temperature (°F) and weather condition** at the device's location.

It uses **Open-Meteo** (no API key) and `expo-location`. This is separate from the Apple LLM challenge generator and does not use WeatherKit.

## Run

```bash
npm install
npx expo install expo-location
npm start
```

Tap **Get current weather** and grant foreground location permission. The app requests only `temperature_2m` and `weather_code` from Open-Meteo, validates the JSON with Zod, converts the condition code to a short label, and displays only temperature and condition. Location permission and network errors are shown when necessary.

## Tests

```bash
npm test
npm run typecheck
```

Tests are source-level smoke tests, not a live API or simulator test. On a simulator, set a simulated location. Coordinates are sent to Open-Meteo only when fetching weather; no server-side storage is added.
