import { Stack } from 'expo-router';

export default function ConsultarLayout() {
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
          title: 'Consultar',
        }}
      />
      <Stack.Screen
        name="veterinarios"
        options={{
          title: 'Veterinarios',
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen
        name="consulta-chat"
        options={{
          title: 'Consulta',
        }}
      />
      <Stack.Screen
        name="pacientes"
        options={{
          title: 'Mis Pacientes',
        }}
      />
      <Stack.Screen
        name="pago-consulta"
        options={{
          title: 'Pago de Consulta',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="video-call"
        options={{
          title: 'Llamada',
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack>
  );
}
