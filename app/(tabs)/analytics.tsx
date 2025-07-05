import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';

export default function AnalyticsScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const qrRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  useEffect(() => {
    const loadCustomization = async () => {
      const all = await AsyncStorage.getItem('custom_qr_map');
      const parsed = all ? JSON.parse(all) : {};
      const key = `${name}|${text}`;
      if (parsed[key]) {
        setQrColor(parsed[key].qrColor || '#000000');
        setBgColor(parsed[key].bgColor || '#ffffff');
      }
    };
    loadCustomization();
  }, [name, text]);

  const handleShareQR = async () => {
    const ref = qrRef.current;
    if (!ref || typeof ref.capture !== 'function') {
      Alert.alert('QR not ready to share');
      return;
    }

    const uri = await ref.capture();
    await Sharing.shareAsync(uri);
  };

  if (!text || !name) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Missing QR data. Please go back and select a project.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>{name}</Title>

      <Text style={styles.label}>QR Code:</Text>
      <View style={styles.qrWrapper}>
        <ViewShot ref={qrRef}>
          <QRCode value={text} size={200} color={qrColor} backgroundColor={bgColor} />
        </ViewShot>
      </View>

      <Button mode="outlined" onPress={handleShareQR}>
        Share QR
      </Button>

      <Text style={styles.label}>Encoded Content:</Text>
      <Text style={styles.content}>{text}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    color: '#444',
  },
  content: {
    fontSize: 14,
    marginTop: 8,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  qrWrapper: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
