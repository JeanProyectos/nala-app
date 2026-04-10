import { Redirect } from 'expo-router';

export default function LegacyPacientesRedirect() {
  return <Redirect href="/(tabs)/consultar/pacientes" />;
}
