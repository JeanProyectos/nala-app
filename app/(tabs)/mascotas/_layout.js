import { Stack } from 'expo-router';

export default function MascotasLayout() {
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
          title: 'Mis Mascotas',
        }}
      />
    </Stack>
  );
}
