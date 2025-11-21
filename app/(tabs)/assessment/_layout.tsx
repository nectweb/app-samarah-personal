import { Stack } from 'expo-router';

export default function AssessmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
