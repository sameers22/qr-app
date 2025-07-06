import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ColorPicker from 'react-native-wheel-color-picker';
import eventBus from '../utils/event-bus';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function CustomizeScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [projectId, setProjectId] = useState('');
  const [showQRPicker, setShowQRPicker] = useState(false);
  const [showBGPicker, setShowBGPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/get-projects`);
        const data = await res.json();
        const match = data.projects?.find((p: any) => p.name === name && p.text === text);
        if (match) {
          setQrColor(match.qrColor || '#000000');
          setBgColor(match.bgColor || '#ffffff');
          setProjectId(match.id);
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        Alert.alert('Error', 'Could not load project customization');
      }
    };
    fetchProject();
  }, [name, text]);

  const updateColors = async (qrColorValue: string, bgColorValue: string) => {
    if (!projectId) {
      Alert.alert('Missing project ID');
      return;
    }

    try {
      await fetch(`${BACKEND_URL}/api/update-color/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrColor: qrColorValue, bgColor: bgColorValue }),
      });

      eventBus.emit('customizationUpdated', { name, text });
    } catch (err) {
      console.error('Color update failed:', err);
      Alert.alert('Failed to update colors');
    }
  };

  const handleSave = async () => {
    await updateColors(qrColor, bgColor);
    router.back();
  };

  const handleResetToDefault = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      const defaultQR = '#000000';
      const defaultBG = '#ffffff';
      setQrColor(defaultQR);
      setBgColor(defaultBG);
      await updateColors(defaultQR, defaultBG);
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
        theme={{ colors: { primary: '#2196F3' } }}
      />

      <Button onPress={() => setShowQRPicker(!showQRPicker)} style={styles.toggleButton} textColor="#2196F3">
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
        theme={{ colors: { primary: '#2196F3' } }}
      />

      <Button onPress={() => setShowBGPicker(!showBGPicker)} style={styles.toggleButton} textColor="#2196F3">
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

      <Button mode="contained" onPress={handleSave} style={styles.saveButton} buttonColor="#2196F3">
        Save & Go Back
      </Button>

      <Button mode="outlined" onPress={handleResetToDefault} style={styles.resetButton} textColor="#2196F3">
        Reset to Default
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 80,
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
