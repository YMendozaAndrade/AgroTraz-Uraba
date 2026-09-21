import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDb } from './src/db';
import { leerSesion, cerrarSesion } from './src/auth';
import LoginScreen from './src/screens/LoginScreen';
import EvaluacionesScreen from './src/screens/EvaluacionesScreen';
import SyncScreen from './src/screens/SyncScreen';
import { estilos } from './src/estilos';

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [tab, setTab] = useState('eval');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    initDb();
    leerSesion().then((s) => {
      if (s) setSesion(s);
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  async function salir() {
    await cerrarSesion();
    setSesion(null);
    setTab('eval');
  }

  if (cargando) return null;

  if (!sesion) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <LoginScreen alEntrar={(token, usuario) => setSesion({ token, usuario })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f1e8' }}>
      <StatusBar style="dark" />
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={estilos.tabs}>
          <TouchableOpacity
            style={[estilos.tab, tab === 'eval' && estilos.tabActiva]}
            onPress={() => setTab('eval')}
          >
            <Text style={[estilos.tabTexto, tab === 'eval' && estilos.tabTextoActiva]}>📋 Evaluar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.tab, tab === 'sync' && estilos.tabActiva]}
            onPress={() => setTab('sync')}
          >
            <Text style={[estilos.tabTexto, tab === 'sync' && estilos.tabTextoActiva]}>🔄 Sincronizar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.tab} onPress={salir}>
            <Text style={estilos.tabTexto}>Salir</Text>
          </TouchableOpacity>
        </View>
        <Text style={estilos.subtitulo}>
          {sesion.usuario.nombre || ''} · {sesion.usuario.rol || ''}
        </Text>
      </View>
      {tab === 'eval'
        ? <EvaluacionesScreen key="eval" />
        : <SyncScreen key="sync" token={sesion.token} />}
    </SafeAreaView>
  );
}
