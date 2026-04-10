import { Stack } from 'expo-router';
import { COLORS } from '../../../styles/theme';

export default function CommunityLayout() {
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
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Comunidad Veterinaria',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-post"
        options={{
          title: 'Crear Post',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="post-detail"
        options={{
          title: 'Detalle del Post',
        }}
      />
    </Stack>
  );
}
