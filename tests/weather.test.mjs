import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/weather.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
test('requests only temperature and condition code', () => {
  assert.match(source, /current: 'temperature_2m,weather_code'/);
  assert.doesNotMatch(source, /relative_humidity_2m|wind_speed_10m/);
});
test('validates external response and handles HTTP errors', () => {
  assert.match(source, /WeatherResponseSchema\.parse\(raw\)/);
  assert.match(source, /!response\.ok/);
});
test('displays temperature and condition only', () => {
  assert.match(app, /weather\.temperature/);
  assert.match(app, /weather\.condition/);
  assert.doesNotMatch(app, /Humidity:|Wind:|Raw external API JSON|Observation time:/);
});
