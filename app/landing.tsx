import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { colors, fonts, fontSizes, spacing } from '@/src/theme';
import { ThemedText } from '@/components/ThemedText';
import GradientButton from '@/components/ui/GradientButton';
import ScreenContainer from '@/components/ui/ScreenContainer';

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    router.push('/(auth)/signup');
  };

  return (
    <ScreenContainer style={styles.container}>
      {/* Subtle glow accent behind title */}
      <View style={styles.glowOrb} />

      <View style={styles.hero}>
        <ThemedText type="title" style={styles.title}>UBConnect</ThemedText>
        <ThemedText type="muted" style={styles.tagline}>
          Discover events. Meet your campus.
        </ThemedText>
      </View>

      <View style={styles.buttonGroup}>
        <GradientButton
          title="Login"
          onPress={handleLogin}
          size="lg"
          style={styles.button}
        />
        <GradientButton
          title="Sign Up"
          onPress={handleSignup}
          variant="outline"
          size="lg"
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowOrb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primaryGlow,
    top: '18%',
    alignSelf: 'center',
    opacity: 0.6,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: 42,
    lineHeight: 50,
    color: colors.text,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    maxWidth: 320,
    gap: spacing.base,
  },
  button: {
    width: '100%',
  },
});
