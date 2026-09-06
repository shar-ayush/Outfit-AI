// src/utils/weatherUtils.js
//
// DEVIATION FROM PLAN: frontend-design-plan.md specifies OpenWeather, which
// requires an API key you'd need to sign up for and store as a secret.
// Using Open-Meteo instead — a free, no-API-key weather API — so the app
// works out of the box for anyone cloning this project. Swap this file for
// an OpenWeather-backed implementation later if you want richer data
// (minute-level forecasts, etc.); the return shape below is what the rest
// of the app (useWeather hook, WeatherWidget, Home's daily query builder)
// depends on, so keep it stable if you do swap providers.

// WMO Weather interpretation codes (used by Open-Meteo) collapsed into the
// small vocabulary the backend's intent extraction understands
// (hot/cold/mild/rain — see intentService.js VALID.weather) plus a
// human-readable condition string and a MaterialCommunityIcons name.
function interpretWeatherCode(code) {
  if (code === 0) return { condition: 'Clear sky', icon: 'weather-sunny' };
  if ([1, 2].includes(code)) return { condition: 'Partly cloudy', icon: 'weather-partly-cloudy' };
  if (code === 3) return { condition: 'Overcast', icon: 'weather-cloudy' };
  if ([45, 48].includes(code)) return { condition: 'Foggy', icon: 'weather-fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Drizzle', icon: 'weather-rainy' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain', icon: 'weather-pouring' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', icon: 'weather-snowy' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: 'weather-lightning' };
  return { condition: 'Clear', icon: 'weather-sunny' };
}

// Maps a temperature to the coarse bucket the backend's outfit-suggestion
// pipeline expects for weatherSuitability filtering (see hybridRetrieval.js
// / intentService.js VALID.weather).
export function temperatureToWeatherSuitability(tempCelsius) {
  if (tempCelsius > 28) return 'hot';
  if (tempCelsius < 15) return 'cold';
  return 'mild';
}

export async function fetchWeatherByCoords(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather request failed');

  const data = await response.json();
  const temperature = Math.round(data.current.temperature_2m);
  const { condition, icon } = interpretWeatherCode(data.current.weather_code);

  return {
    temperature,
    condition,
    icon,
    weatherSuitability: temperatureToWeatherSuitability(temperature),
  };
}
