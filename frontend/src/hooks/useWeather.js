// src/hooks/useWeather.js
//
// Requests foreground location permission, gets a one-shot position, then
// fetches current weather. Wrapped in useQuery purely for its loading/error
// state ergonomics and caching (avoids re-fetching on every Home re-render);
// the actual "freshness" of weather matters less than not hammering the
// device GPS repeatedly, so staleTime is generous (10 min).

import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchWeatherByCoords } from '@/utils/weatherUtils';

async function getWeatherForCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low, // weather doesn't need precise GPS
  });

  return fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather', 'current'],
    queryFn: getWeatherForCurrentLocation,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export default useWeather;
