import { Stack } from 'expo-router';

export default function CommunityLayout() {
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
          title: 'Comunidad Veterinaria',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
