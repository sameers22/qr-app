import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import eventBus from '../../utils/event-bus';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function AnalyticsScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const qrRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  const isURL = /^https?:\/\//i.test(text);
  const linkToOpen = isURL
    ? text
    : `https://www.google.com/search?q=${encodeURIComponent(text)}`;

  const loadCustomizationFromBackend = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/get-projects`);
      const data = await res.json();
      const match = data.projects?.find((p: any) => p.name === name && p.text === text);
      if (match) {
        setQrColor(match.qrColor || '#000000');
        setBgColor(match.bgColor || '#ffffff');
      }
    } catch (err) {
      console.error('❌ Failed to load project customization:', err);
    }
  };

  useEffect(() => {
    loadCustomizationFromBackend();

    const handler = (payload: { name: string; text: string }) => {
      if (payload.name === name && payload.text === text) {
        loadCustomizationFromBackend();
      }
    };

    eventBus.on('customizationUpdated', handler);
    return () => {
      eventBus.off('customizationUpdated', handler);
    };
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

  const handleCustomizePress = () => {
    router.push({
      pathname: '/customize',
      params: { name, text },
    });
  };

  const handleOpenLink = async () => {
    try {
      await Linking.openURL(linkToOpen);
    } catch (err) {
      Alert.alert('Failed to open', 'Could not launch the URL or search.');
    }
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

      {/* Share + Open buttons in same row */}
      <View style={styles.shareRow}>
        <Button
          mode="outlined"
          onPress={handleShareQR}
          style={styles.shareButton}
          textColor="#2196F3"
        >
          Share QR
        </Button>
        <Button
          mode="outlined"
          onPress={handleOpenLink}
          style={styles.shareButton}
          textColor="#2196F3"
        >
          {isURL ? 'Open Link' : 'Search Online'}
        </Button>
      </View>

      <View style={styles.buttonRow}>
        <Button mode="contained" onPress={handleCustomizePress} style={styles.button} buttonColor="#2196F3">
          Customize
        </Button>
      </View>

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
  shareRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    borderColor: '#2196F3',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12,
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
