import { Redirect } from 'expo-router';

export default function LegacySaludRedirect() {
  return <Redirect href="/(tabs)/salud" />;
}
