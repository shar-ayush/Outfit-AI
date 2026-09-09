import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchWeatherByCoords } from '@/utils/weatherUtils';

async function getWeatherForCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
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
