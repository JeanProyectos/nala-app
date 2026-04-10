import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyConsultaChatRedirect() {
  const params = useLocalSearchParams();
  const id = params?.id;
  const href = id ? `/(tabs)/consultar/consulta-chat?id=${id}` : '/(tabs)/consultar';
  return <Redirect href={href} />;
}
