import { Stack } from 'expo-router';
import { COLORS } from '../../../styles/theme';

export default function MascotasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mis Mascotas',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="editar"
        options={{
          title: 'Editar Mascota',
        }}
      />
    </Stack>
  );
}
