import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../contexts/SecurityContext';

// Screens
import { SignInScreen } from '../screens/auth/SignInScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { VerifyOTPScreen } from '../screens/auth/VerifyOTPScreen';
import { HomeScreen } from '../screens/tabs/HomeScreen';
import { TodayScreen } from '../screens/tabs/TodayScreen';
import { GroupsScreen } from '../screens/tabs/GroupsScreen';
import { ScheduleScreen } from '../screens/tabs/ScheduleScreen';
import { ProfileScreen } from '../screens/tabs/ProfileScreen';
import { CreateGroupScreen } from '../screens/group/CreateGroupScreen';
import { GroupDetailScreen } from '../screens/group/GroupDetailScreen';
import { InviteMembersScreen } from '../screens/group/InviteMembersScreen';

import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from '../types/navigation';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen
        name="VerifyOTP"
        component={VerifyOTPScreen}
        options={{
          headerShown: true,
          title: 'Verify Email',
          headerStyle: { backgroundColor: '#2563EB' },
          headerTintColor: '#FFFFFF',
        }}
      />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Today':
              iconName = focused ? 'today' : 'today-outline';
              break;
            case 'Groups':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' as const },
        headerStyle: { backgroundColor: '#2563EB' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' as const },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <MainTab.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: "Today's Check-in" }}
      />
      <MainTab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: 'My Groups' }}
      />
      <MainTab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Payout Schedule' }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{
                headerShown: true,
                title: 'Create Group',
                headerStyle: { backgroundColor: '#2563EB' },
                headerTintColor: '#FFFFFF',
                presentation: 'modal',
              }}
            />
            <RootStack.Screen
              name="GroupDetail"
              component={GroupDetailScreen}
              options={{
                headerShown: true,
                title: 'Group Details',
                headerStyle: { backgroundColor: '#2563EB' },
                headerTintColor: '#FFFFFF',
              }}
            />
            <RootStack.Screen
              name="InviteMembers"
              component={InviteMembersScreen}
              options={{
                headerShown: true,
                title: 'Invite Members',
                headerStyle: { backgroundColor: '#2563EB' },
                headerTintColor: '#FFFFFF',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}