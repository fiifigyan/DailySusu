import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface SecurityContextType {
  isDeviceSecure: boolean;
  authenticateWithBiometrics: () => Promise<boolean>;
  lockApp: () => void;
  unlockApp: () => void;
}

const SecurityContext = createContext<SecurityContextType>({} as SecurityContextType);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number>(0);
  const isLocked = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      // App going to background
      backgroundTimestamp.current = Date.now();
      lockApp();
    } else if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App coming to foreground
      const timeInBackground = Date.now() - backgroundTimestamp.current;
      
      // Auto-lock after 30 seconds in background
      if (timeInBackground > 30000) {
        handleAppReturn();
      }
    }

    appState.current = nextAppState;
  };

  const handleAppReturn = async () => {
    if (isLocked.current) {
      const authenticated = await authenticateWithBiometrics();
      if (authenticated) {
        unlockApp();
      }
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return true; // Device doesn't support biometrics
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access XSusu',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: true,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  const lockApp = () => {
    isLocked.current = true;
  };

  const unlockApp = () => {
    isLocked.current = false;
  };

  return (
    <SecurityContext.Provider
      value={{
        isDeviceSecure: true,
        authenticateWithBiometrics,
        lockApp,
        unlockApp,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export const useSecurity = () => useContext(SecurityContext);