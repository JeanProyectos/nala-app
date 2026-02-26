import { Stack } from 'expo-router';

export default function SaludLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F8F8F8',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Salud',
        }}
      />
      <Stack.Screen
        name="recordatorios"
        options={{
          title: 'Recordatorios',
        }}
      />
    </Stack>
  );
}
