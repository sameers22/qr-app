import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TabBarBackground() {
  return <View style={styles.background} />;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#ffffff', // ✅ White background
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90, // ⬅️ Match the tabBar height exactly
    zIndex: -1, // ⬅️ Make sure it stays behind the tab bar buttons/icons
  },
});
