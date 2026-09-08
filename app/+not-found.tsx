import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="font-sans text-3xl text-foreground">Lost the trail</Text>
        <Link href="/live" className="mt-4">
          <Text className="font-serif text-base text-primary">Back to workout</Text>
        </Link>
      </View>
    </>
  );
}
