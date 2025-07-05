import AsyncStorage from '@react-native-async-storage/async-storage';
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

const BACKEND_URL = 'https://qr-backend-o6i5.onrender.com';

export default function GenerateScreen() {
  const [text, setText] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [search, setSearch] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<ViewShot>(null);
  const [currentTrackingId, setCurrentTrackingId] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadProjects();
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
      console.error('❌ Load error:', err);
      const fallback = await AsyncStorage.getItem('qr_cache');
      if (fallback) setProjects(JSON.parse(fallback));
    } finally {
      setLoading(false);
    }
  };

  const saveProjectToBackend = async (base64: string, id: string) => {
    const payload = {
      id,
      name: projectName.trim(),
      text: text.trim(),
      time: new Date().toISOString(),
      qrImage: base64,
      type: 'qr_project',
      scanCount: 0,
    };
    const res = await fetch(`${BACKEND_URL}/api/save-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok) {
      Alert.alert('✅ Saved project!');
      setText('');
      setProjectName('');
      setShowProjectModal(false);
      setCurrentTrackingId('');
      loadProjects();
    } else {
      Alert.alert('❌ Save failed', json.message || 'Try again later');
    }
  };

  const handleGenerate = () => {
    if (!text.trim()) return;
    const id = `${Date.now()}-${Math.random()}`;
    setCurrentTrackingId(id);
    setShowQR(true);
    Alert.alert('Save Project', 'Do you want to save this QR code project?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => setShowProjectModal(true) },
    ]);
  };

  const handleSave = async () => {
    if (!qrRef.current?.capture || !currentTrackingId) {
      Alert.alert('QR not ready');
      return;
    }
    const uri = await qrRef.current.capture();
    if (!uri) {
      Alert.alert('Failed to capture QR');
      return;
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.toString().split(',')[1] || '';
      saveProjectToBackend(base64, currentTrackingId);
    };
    reader.readAsDataURL(blob);
  };

  const handleEditChange = (field: 'name' | 'text', value: string, index: number) => {
    const updated = [...projects];
    updated[index][field] = value;
    updated[index].time = new Date().toISOString();
    setProjects(updated);
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
    loadProjects();
  };

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    if (!query.trim()) return setFilteredProjects(projects);
    const lower = query.toLowerCase();
    setFilteredProjects(projects.filter(p => p.name.toLowerCase().includes(lower) || p.text.toLowerCase().includes(lower)));
  }, [projects]);

  const handleProjectPress = async (item: any) => {
    await AsyncStorage.setItem('active_project', JSON.stringify(item));
    router.push({ pathname: '/(tabs)/analytics', params: { text: item.text, name: item.name, id: item.id } });
  };

  const shareQR = async () => {
    if (!qrRef.current?.capture) return;
    const uri = await qrRef.current.capture();
    if (uri) await Sharing.shareAsync(uri);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <Title style={styles.heading}>QR Code Generator</Title>

      <TextInput
        label="Enter URL or text"
        mode="outlined"
        value={text}
        onChangeText={(val) => { setText(val); if (!val.trim()) setShowQR(false); }}
        style={styles.input}
      />

      <View style={styles.row}>
        <Button mode="contained" onPress={handleGenerate} disabled={!text.trim()}>Generate QR</Button>
        <Button mode="outlined" onPress={() => { setText(''); setShowQR(false); }}>Clear</Button>
      </View>

      {showQR && text.trim().length > 0 && (
        <View style={styles.qrContainer}>
          <ViewShot ref={qrRef}>
            <QRCode value={`${BACKEND_URL}/track/${currentTrackingId}`} size={200} />
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
      />

      <Title style={styles.heading}>Saved Projects</Title>
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {editIndex === index ? (
              <>
                <RNTextInput value={item.name} onChangeText={(val) => handleEditChange('name', val, index)} />
                <RNTextInput value={item.text} onChangeText={(val) => handleEditChange('text', val, index)} />
                <Button onPress={() => saveEditedProject(index)}>Save</Button>
                <Button onPress={() => setEditIndex(null)}>Cancel</Button>
              </>
            ) : (
              <TouchableOpacity onPress={() => handleProjectPress(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text>{item.text}</Text>
                <Text style={styles.time}>{new Date(item.time).toLocaleString()}</Text>
                {item.qrImage && (
                  <Image source={{ uri: `data:image/png;base64,${item.qrImage}` }} style={{ width: 100, height: 100, marginTop: 10 }} />
                )}
                <Text style={{ marginTop: 6, fontSize: 13 }}>Scans: {item.scanCount ?? 0}</Text>
                <View style={styles.row}>
                  <Button onPress={() => setEditIndex(index)}>Edit</Button>
                  <Button onPress={() => handleDeleteProject(index)} labelStyle={{ color: 'red' }}>Delete</Button>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<Text>No projects yet.</Text>}
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
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    color: '#222',
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
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
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
  },
});
