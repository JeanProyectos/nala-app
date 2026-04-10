import { Redirect } from 'expo-router';

export default function LegacyVeterinariosRedirect() {
  return <Redirect href="/(tabs)/consultar/veterinarios" />;
}
