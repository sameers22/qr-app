// app/(tabs)/index.tsx (GenerateScreen)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput as RNTextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Divider, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import eventBus from '../../utils/event-bus';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function GenerateScreen() {
  const [text, setText] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [search, setSearch] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<ViewShot>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  useEffect(() => {
    loadProjects();

    const listener = () => loadProjects();
    eventBus.on('customizationUpdated', listener);
    return () => eventBus.off('customizationUpdated', listener);
  }, []);

  useEffect(() => {
    handleSearch(search);
  }, [projects, search]);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/get-projects`);
      const data = await res.json();
      setProjects(data.projects || []);
      setFilteredProjects(data.projects || []);
      await AsyncStorage.setItem('qr_cache', JSON.stringify(data.projects));
    } catch (err) {
      console.error('Load error:', err);
      const fallback = await AsyncStorage.getItem('qr_cache');
      if (fallback) setProjects(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const saveProjectToBackend = async (base64: string) => {
    const payload = {
      name: projectName.trim(),
      text: text.trim(),
      time: new Date().toISOString(),
      qrImage: base64,
      qrColor,
      bgColor,
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/save-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok) {
        Alert.alert('Saved project!');
        setText('');
        setProjectName('');
        setQrColor('#000000');
        setBgColor('#ffffff');
        setShowProjectModal(false);
        loadProjects();
      } else {
        Alert.alert('Save failed', json.message || 'Try again later');
      }
    } catch (err) {
      console.error('Network error:', err);
      Alert.alert('Save failed', 'Network error occurred');
    }
  };

  const handleGenerate = () => {
    if (!text.trim()) return;
    setQrColor('#000000');
    setBgColor('#ffffff');
    setShowQR(true);
    Alert.alert('Save Project', 'Do you want to save this QR code project?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => setShowProjectModal(true) },
    ]);
  };

  const handleSave = async () => {
    if (!qrRef.current?.capture) {
      Alert.alert('QR not available');
      return;
    }

    try {
      const uri = await qrRef.current.capture();
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await saveProjectToBackend(base64);
    } catch (err) {
      console.error('Failed to save QR:', err);
      Alert.alert('Save failed', 'QR could not be captured');
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    if (!query.trim()) return setFilteredProjects(projects);
    const lower = query.toLowerCase();
    setFilteredProjects(projects.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.text.toLowerCase().includes(lower)
    ));
  }, [projects]);

  const handleProjectPress = async (item: any) => {
    await AsyncStorage.setItem('active_project', JSON.stringify(item));
    setQrColor(item.qrColor || '#000000');
    setBgColor(item.bgColor || '#ffffff');
    router.push({
      pathname: '/(tabs)/analytics',
      params: { text: item.text, name: item.name }
    });
  };

  const shareQR = async () => {
    if (!qrRef.current?.capture) return;
    const uri = await qrRef.current.capture();
    if (uri) await Sharing.shareAsync(uri);
  };

  const saveEditedProject = async (index: number) => {
    const item = projects[index];
    await fetch(`${BACKEND_URL}/api/update-project/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, text: item.text }),
    });
    setEditIndex(null);
    loadProjects();
  };

  const handleDeleteProject = async (index: number) => {
    const id = projects[index].id;
    await fetch(`${BACKEND_URL}/api/delete-project/${id}`, { method: 'DELETE' });
    await AsyncStorage.removeItem(`customization_${id}`);
    loadProjects();
  };

  const handleEditChange = (field: 'name' | 'text', value: string, index: number) => {
    const updated = [...projects];
    updated[index][field] = value;
    updated[index].time = new Date().toISOString();
    setProjects(updated);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Title style={styles.heading}>QR Code Generator</Title>

      <TextInput
        label="Enter URL or text"
        mode="outlined"
        value={text}
        onChangeText={(val) => {
          setText(val);
          if (!val.trim()) setShowQR(false);
        }}
        style={styles.input}
        theme={{ colors: { primary: '#2196F3' } }}
      />

      <View style={styles.row}>
        <Button
          mode="contained"
          onPress={handleGenerate}
          disabled={!text.trim()}
          buttonColor="#2196F3"
        >
          Generate QR
        </Button>
        <Button
          mode="outlined"
          onPress={() => { setText(''); setShowQR(false); }}
          textColor="#2196F3"
          style={{ borderColor: '#2196F3' }}
        >
          Clear
        </Button>
      </View>

      {showQR && text.trim().length > 0 && (
        <View style={styles.qrContainer}>
          <ViewShot ref={qrRef}>
            <QRCode value={text} size={200} color={qrColor} backgroundColor={bgColor} />
          </ViewShot>
          <Button onPress={shareQR} style={{ marginTop: 12 }}>Share QR</Button>
        </View>
      )}

      <Divider style={{ marginVertical: 20 }} />

      <TextInput
        placeholder="Search saved projects..."
        value={search}
        onChangeText={handleSearch}
        mode="outlined"
        style={styles.input}
        theme={{ colors: { primary: '#2196F3' } }}
      />

      <Title style={styles.heading}>Saved Projects</Title>
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {editIndex === index ? (
              <>
                <RNTextInput
                  value={item.name}
                  onChangeText={(val) => handleEditChange('name', val, index)}
                  style={{ marginBottom: 8 }}
                />
                <RNTextInput
                  value={item.text}
                  onChangeText={(val) => handleEditChange('text', val, index)}
                />
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Button onPress={() => saveEditedProject(index)}>Save</Button>
                  <Button onPress={() => setEditIndex(null)}>Cancel</Button>
                </View>
              </>
            ) : (
              <TouchableOpacity onPress={() => handleProjectPress(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text>{item.text}</Text>
                <Text style={styles.time}>{new Date(item.time).toLocaleString()}</Text>
                {item.qrImage && (
                  <Image
                    source={{ uri: `data:image/png;base64,${item.qrImage}` }}
                    style={{ width: 100, height: 100, marginTop: 10 }}
                  />
                )}
                <View style={[styles.row, { marginTop: 8 }]}>
                  <Button onPress={() => setEditIndex(index)}>Edit</Button>
                  <Button onPress={() => handleDeleteProject(index)} labelStyle={{ color: 'red' }}>Delete</Button>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? () => <Text>No projects yet.</Text> : null}
        ref={flatListRef}
      />

      <Modal visible={showProjectModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text>Enter Project Name:</Text>
            <TextInput
              placeholder="Project Name"
              value={projectName}
              onChangeText={setProjectName}
              mode="outlined"
              style={{ marginVertical: 10 }}
            />
            <Button mode="contained" onPress={handleSave}>Save</Button>
            <Button onPress={() => setShowProjectModal(false)} style={{ marginTop: 8 }}>Cancel</Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    paddingBottom: 100,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2196F3',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderLeftColor: '#2196F3',
    borderLeftWidth: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2196F3',
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000066',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
    borderColor: '#2196F3',
    borderWidth: 1,
  },
});
