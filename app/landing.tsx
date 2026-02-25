import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UBConnect</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontWeight: '500',
    color: 'black',
  },
  button: {
    backgroundColor: '#866FD8',
    height: 50,
    width: 300,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    marginTop: 25,
  },
  buttonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '500',
  },
});
