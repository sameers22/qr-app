import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import eventBus from '../../utils/event-bus';

import * as scale from 'd3-scale';
import { Grid, LineChart, XAxis } from 'react-native-svg-charts';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function AnalyticsScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [scanEvents, setScanEvents] = useState<any[]>([]);
  const qrRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  // QR Mode: "tracked" or "direct"
  const [qrMode, setQrMode] = useState<'tracked' | 'direct'>('tracked');

  // Dynamic QR value
  const qrValue =
    qrMode === 'tracked' && projectId
      ? `${BACKEND_URL}/track/${projectId}`
      : text;

  const isURL = /^https?:\/\//i.test(text);
  const linkToOpen = isURL
    ? text
    : `https://www.google.com/search?q=${encodeURIComponent(text)}`;

  // Load project info and scan analytics
  const loadAnalytics = async () => {
    try {
      // Fetch all projects to get the correct project ID
      const res = await fetch(`${BACKEND_URL}/api/get-projects`);
      const data = await res.json();
      const match = data.projects?.find((p: any) => p.name === name && p.text === text);
      if (match) {
        setProjectId(match.id);
        setQrColor(match.qrColor || '#000000');
        setBgColor(match.bgColor || '#ffffff');
        // Fetch scan analytics for this project
        const analyticsRes = await fetch(`${BACKEND_URL}/api/get-scan-analytics/${match.id}`);
        const analyticsData = await analyticsRes.json();
        setScanCount(analyticsData.scanCount || 0);
        setScanEvents(analyticsData.scanEvents || []);
      }
    } catch (err) {
      console.error('❌ Failed to load analytics:', err);
    }
  };

  useEffect(() => {
    loadAnalytics();
    const handler = (payload: { name: string; text: string }) => {
      if (payload.name === name && payload.text === text) {
        loadAnalytics();
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

  // --- Chart Data ---
  const chartData = (() => {
    if (scanEvents.length === 0) return [];
    const dayMap: { [day: string]: number } = {};
    scanEvents.forEach(ev => {
      const d = new Date(ev.timestamp);
      const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    // Return array sorted by day
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, count]) => count);
  })();
  const chartLabels = (() => {
    if (scanEvents.length === 0) return [];
    const daySet = new Set<string>();
    scanEvents.forEach(ev => {
      const d = new Date(ev.timestamp);
      const day = d.toISOString().slice(0, 10);
      daySet.add(day);
    });
    return Array.from(daySet).sort();
  })();

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

      {/* --- QR Mode Toggle --- */}
      <View style={styles.qrModeToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, qrMode === 'tracked' && styles.toggleActive]}
          onPress={() => setQrMode('tracked')}
        >
          <Text style={{ color: qrMode === 'tracked' ? '#fff' : '#2196F3', fontWeight: '700' }}>Tracked QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, qrMode === 'direct' && styles.toggleActive]}
          onPress={() => setQrMode('direct')}
        >
          <Text style={{ color: qrMode === 'direct' ? '#fff' : '#2196F3', fontWeight: '700' }}>Direct QR</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.qrModeDesc}>
        {qrMode === 'tracked'
          ? 'Scan count and analytics will be recorded. QRs open through your backend and then redirect.'
          : 'Encodes the raw text/URL. No analytics or tracking.'}
      </Text>

      <Text style={styles.label}>QR Code:</Text>
      <View style={styles.qrWrapper}>
        <ViewShot ref={qrRef}>
          <QRCode value={qrValue} size={200} color={qrColor} backgroundColor={bgColor} />
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
      <Text style={styles.content}>{qrValue}</Text>

      <Text style={styles.label}>Scan Analytics</Text>
      <Button
        mode="text"
        onPress={loadAnalytics}
        style={{ alignSelf: 'flex-end', marginBottom: 0, marginTop: 2 }}
        textColor="#2196F3"
        icon="refresh"
      >
        Refresh
      </Button>
      <Text style={styles.scanCount}>
        Total scans: <Text style={{ fontWeight: 'bold' }}>{scanCount}</Text>
      </Text>

      {/* Chart: Scans Over Time */}
      {chartData.length > 0 && (
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6, color: '#2196F3' }}>
            Scans Over Time
          </Text>
          <LineChart
            style={{ height: 130, width: Dimensions.get('window').width - 70 }}
            data={chartData}
            svg={{ stroke: '#2196F3', strokeWidth: 3 }}
            contentInset={{ top: 16, bottom: 16 }}
            numberOfTicks={3}
          >
            <Grid />
          </LineChart>
          <XAxis
            style={{ marginHorizontal: -10, height: 20 }}
            data={chartData}
            formatLabel={(value: number, index: number) => chartLabels[index]?.slice(5) || ''}
            contentInset={{ left: 16, right: 16 }}
            svg={{ fontSize: 11, fill: '#999', rotation: 20, originY: 10 }}
            scale={scale.scaleLinear}
          />
        </View>
      )}

      {/* Device/Location List */}
      <Text style={[styles.label, { marginTop: 16 }]}>Scan History</Text>
      {scanEvents.length === 0 && <Text style={{ color: '#aaa' }}>No scans yet.</Text>}
      {scanEvents.slice().reverse().map((event, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.eventTime}>
            {new Date(event.timestamp).toLocaleString()}
          </Text>
          <Text style={styles.eventDevice} numberOfLines={1}>
            Device: {event.userAgent?.slice(0, 55) || 'Unknown'}
          </Text>
          {event.location && (
            <Text style={styles.eventLocation}>
              Location: {event.location.city || 'Unknown'}, {event.location.country || ''}
            </Text>
          )}
        </View>
      ))}
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
  qrModeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
    gap: 0,
    backgroundColor: '#eaf4fb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#2196F3',
  },
  qrModeDesc: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
    marginTop: -3,
    alignSelf: 'center',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    color: '#444',
    alignSelf: 'flex-start',
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
  scanCount: {
    fontSize: 17,
    color: '#2196F3',
    marginTop: 8,
    fontWeight: '600',
    marginBottom: 10,
  },
  row: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#2196F3',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderColor: '#eee',
    borderWidth: 1,
    width: Dimensions.get('window').width - 70,
    alignSelf: 'center',
  },
  eventTime: { fontWeight: '600', fontSize: 15, color: '#333' },
  eventDevice: { fontSize: 12, color: '#888', marginTop: 2 },
  eventLocation: { fontSize: 12, color: '#498', marginTop: 2 },
  eventIp: { fontSize: 11, color: '#bbb', marginTop: 2 },
});
