import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SecurityProvider } from './src/contexts/SecurityContext';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Platform } from 'react-native';

export default function App() {
  useEffect(() => {
    // Prevent screen capture for security
    if (Platform.OS !== 'web') {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {
        // Some devices don't support this
      });
    }

    return () => {
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SecurityProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </SecurityProvider>
    </SafeAreaProvider>
  );
}