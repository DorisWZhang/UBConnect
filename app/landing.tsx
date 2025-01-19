import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';

import React from 'react';

export default function LandingPage() {

    const handleSin = async () => {
        router.push('/explore');
    }

    const handleSup = async () => {
      router.push('/signup');
  }
 
    const router = useRouter(); // Create router instance to navigate
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UBConnect</Text>
      
        <TouchableOpacity style={styles.button} onPress={handleSin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
     
        <TouchableOpacity style={styles.button} onPress={handleSup}>
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
    backgroundColor: 'white'
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontWeight: '500',
    color: 'black'
  },
  button: {
    backgroundColor: 'black',
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
    fontFamily: 'Inter_500Medium',
  },
});
