import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text
} from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ColorPicker from 'react-native-wheel-color-picker';
import eventBus from '../utils/event-bus';

export default function CustomizeScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [showQRPicker, setShowQRPicker] = useState(false);
  const [showBGPicker, setShowBGPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current; // Animation ref

  const key = `${name}|${text}`;

  useEffect(() => {
    const load = async () => {
      const all = await AsyncStorage.getItem('custom_qr_map');
      const parsed = all ? JSON.parse(all) : {};
      if (parsed[key]) {
        setQrColor(parsed[key].qrColor || '#000000');
        setBgColor(parsed[key].bgColor || '#ffffff');
      }
    };
    load();
  }, [key]);

  const handleSave = async () => {
    if (!text || !name) {
      Alert.alert('Missing data');
      return;
    }

    const all = await AsyncStorage.getItem('custom_qr_map');
    const parsed = all ? JSON.parse(all) : {};
    parsed[key] = { qrColor, bgColor };
    await AsyncStorage.setItem('custom_qr_map', JSON.stringify(parsed));

    eventBus.emit('customizationUpdated', { name, text });
    router.back();
  };

  const handleResetToDefault = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      setQrColor('#000000');
      setBgColor('#ffffff');

      const all = await AsyncStorage.getItem('custom_qr_map');
      const parsed = all ? JSON.parse(all) : {};
      parsed[key] = { qrColor: '#000000', bgColor: '#ffffff' };
      await AsyncStorage.setItem('custom_qr_map', JSON.stringify(parsed));

      eventBus.emit('customizationUpdated', { name, text });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Customize QR Code</Title>

      <Text style={styles.label}>QR Color</Text>
      <TextInput
        mode="outlined"
        value={qrColor}
        onChangeText={setQrColor}
        style={styles.input}
      />
      <Button onPress={() => setShowQRPicker(!showQRPicker)} style={styles.toggleButton}>
        {showQRPicker ? 'Hide Picker' : 'Pick QR Color'}
      </Button>
      {showQRPicker && (
        <ColorPicker
          color={qrColor}
          onColorChangeComplete={setQrColor}
          thumbSize={24}
          sliderSize={24}
          noSnap
          row
        />
      )}

      <Text style={styles.label}>Background Color</Text>
      <TextInput
        mode="outlined"
        value={bgColor}
        onChangeText={setBgColor}
        style={styles.input}
      />
      <Button onPress={() => setShowBGPicker(!showBGPicker)} style={styles.toggleButton}>
        {showBGPicker ? 'Hide Picker' : 'Pick Background Color'}
      </Button>
      {showBGPicker && (
        <ColorPicker
          color={bgColor}
          onColorChangeComplete={setBgColor}
          thumbSize={24}
          sliderSize={24}
          noSnap
          row
        />
      )}

      <Text style={styles.label}>Live Preview</Text>
      <Animated.View style={[styles.previewWrapper, { opacity: fadeAnim }]}>
        <QRCode value={text} size={200} color={qrColor} backgroundColor={bgColor} />
      </Animated.View>

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        Save & Go Back
      </Button>

      <Button mode="outlined" onPress={handleResetToDefault} style={styles.resetButton}>
        Reset to Default
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    color: '#222',
  },
  label: {
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    marginTop: 8,
    backgroundColor: '#fff',
  },
  toggleButton: {
    marginTop: 12,
  },
  previewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    marginTop: 32,
  },
  resetButton: {
    marginTop: 16,
    borderColor: '#aaa',
  },
});
