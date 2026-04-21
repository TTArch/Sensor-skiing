/**
 * App.tsx - Navigation shell for Ski Coach MVP
 * Sets up React Navigation with Home, ActiveRun, and RunReview screens
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ActiveRunScreen from './src/screens/ActiveRunScreen';
import RunReviewScreen from './src/screens/RunReviewScreen';
import { colors } from './src/utils/theme';
import { LanguageProvider } from './src/contexts/LanguageContext';
import type { RunResult } from './src/types';

export type RootStackParamList = {
  Home: undefined;
  ActiveRun: undefined;
  RunReview: { run: RunResult };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="ActiveRun"
            component={ActiveRunScreen}
            options={{
              gestureEnabled: false, // Prevent accidental back during run
            }}
          />
          <Stack.Screen
            name="RunReview"
            component={RunReviewScreen}
            options={{
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
