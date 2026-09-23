import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type Ref } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { PushScreen } from '@/components/PushScreen';
import { getProfile, normalizeUsername, profileIssue, saveProfile } from '@/lib/profile';
import { CHERRY } from '@/lib/theme';

const BIO_MAX = 160;

export default function EditProfileScreen() {
  const saved = getProfile();
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const muted = theme === 'dark' ? '#A3A3A3' : '#8A8A8A';
  const rule = theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const [name, setName] = useState(saved.name);
  const [username, setUsername] = useState(saved.username);
  const [bio, setBio] = useState(saved.bio);
  const [photoUri, setPhotoUri] = useState<string | null>(saved.photoUri);
  const [showIssue, setShowIssue] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const navigation = useNavigation();
  const dirtyRef = useRef(false);
  const leaving = useRef(false);

  const issue = profileIssue({ name, username });
  const dirty =
    name.trim() !== saved.name ||
    normalizeUsername(username) !== saved.username ||
    bio.trim() !== saved.bio ||
    photoUri !== saved.photoUri;
  const ready = dirty && !issue;
  dirtyRef.current = dirty;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!dirtyRef.current || leaving.current) return;
      event.preventDefault();
      Alert.alert('Discard changes?', 'Your edits will not be saved.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            leaving.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        shape: 'oval',
        quality: 0.85,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (!uri) return;
      setPhotoUri(uri);
    } catch {
      Alert.alert('Photos', 'Couldn’t open your photo library.');
    }
  };

  const commit = () => {
    if (issue) {
      setShowIssue(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    leaving.current = true;
    if (dirty) {
      saveProfile({ name, username, bio, photoUri });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: { backgroundColor: theme === 'dark' ? '#161616' : '#fafafa' },
        }}
      />
      <PushScreen
        title="Edit"
        backLabel="Cancel"
        keyboard
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done"
            onPress={commit}
            hitSlop={8}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <GlassSurface
              fill={false}
              tintColor={ready ? CHERRY : undefined}
              className="h-11 items-center justify-center rounded-full px-4">
              <Text
                className="text-[15px]"
                style={{
                  fontFamily: 'DM Sans',
                  fontWeight: '600',
                  color: ready || theme === 'dark' ? '#fff' : ink,
                }}>
                Done
              </Text>
            </GlassSurface>
          </Pressable>
        }>
        <View className="items-center gap-2 pt-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit photo"
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => void pickPhoto()}
            style={({ pressed }) => ({ alignItems: 'center', gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <View>
              <ProfileAvatar uri={photoUri} size={112} ink={ink} />
              <View className="absolute -bottom-0.5 -right-0.5">
                <GlassSurface
                  fill={false}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ borderRadius: 999 }}>
                  <SymbolView name="camera.fill" size={14} tintColor={ink} />
                </GlassSurface>
              </View>
            </View>
            <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              Edit photo
            </Text>
          </Pressable>
          {photoUri ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => {
                setPhotoUri(null);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                Remove photo
              </Text>
            </Pressable>
          ) : null}
        </View>

        <GlassSurface isInteractive={false} className="px-4">
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderColor={muted}
            ink={ink}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            maxLength={40}
            onSubmitEditing={() => usernameRef.current?.focus()}
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: rule }} />
          <Field
            ref={usernameRef}
            label="Username"
            value={username}
            onChangeText={(value) => setUsername(normalizeUsername(value))}
            placeholder="username"
            placeholderColor={muted}
            ink={ink}
            prefix="@"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            maxLength={20}
            onSubmitEditing={() => bioRef.current?.focus()}
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: rule }} />
          <View className="gap-1 py-3">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                Bio
              </Text>
              {bio.length >= 120 ? (
                <Text
                  className="text-[13px] text-muted-foreground"
                  style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
                  {bio.length}/{BIO_MAX}
                </Text>
              ) : null}
            </View>
            <TextInput
              ref={bioRef}
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, BIO_MAX))}
              placeholder="A short line about you"
              placeholderTextColor={muted}
              selectionColor={CHERRY}
              cursorColor={CHERRY}
              multiline
              maxLength={BIO_MAX}
              textAlignVertical="top"
              style={{
                fontFamily: 'DM Sans',
                fontSize: 17,
                lineHeight: 22,
                color: ink,
                minHeight: 72,
                padding: 0,
              }}
            />
          </View>
        </GlassSurface>

        {showIssue && issue ? (
          <Text
            accessibilityLiveRegion="polite"
            className="-mt-2 text-[13px] text-destructive"
            style={{ fontFamily: 'DM Sans' }}>
            {issue}
          </Text>
        ) : null}
      </PushScreen>
    </>
  );
}

type FieldProps = {
  ref?: Ref<TextInput>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  placeholderColor: string;
  ink: string;
  prefix?: string;
  autoCapitalize?: 'none' | 'words';
  autoCorrect?: boolean;
  autoComplete?: 'name' | 'username';
  textContentType?: 'name' | 'username';
  returnKeyType?: 'next';
  maxLength?: number;
  onSubmitEditing?: () => void;
};

function Field({
  ref,
  label,
  value,
  onChangeText,
  placeholder,
  placeholderColor,
  ink,
  prefix,
  ...input
}: FieldProps) {
  return (
    <View className="gap-1 py-3">
      <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
        {label}
      </Text>
      <View className="flex-row items-center">
        {prefix ? (
          <Text className="text-[17px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          selectionColor={CHERRY}
          cursorColor={CHERRY}
          style={{
            flex: 1,
            fontFamily: 'DM Sans',
            fontSize: 17,
            lineHeight: 22,
            color: ink,
            padding: 0,
          }}
          {...input}
        />
      </View>
    </View>
  );
}
