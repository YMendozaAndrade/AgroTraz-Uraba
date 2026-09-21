import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { api } from '../api';
import { guardarSesion } from '../auth';
import { estilos } from '../estilos';

export default function LoginScreen({ alEntrar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function entrar() {
    if (!email.trim() || !password) {
      setError('Ingrese correo y contraseña');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await api.login(email.trim(), password);
      await guardarSesion(res.token, res.usuario);
      alEntrar(res.token, res.usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1d3b2a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View
            style={{
              width: 76, height: 76, borderRadius: 22, backgroundColor: '#6fae56',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 38 }}>🌱</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>AgroTraz Campo</Text>
          <Text style={{ fontSize: 13, color: '#b9cbbd', marginTop: 4 }}>
            Evaluaciones fitosanitarias sin conexión
          </Text>
        </View>

        <View style={[estilos.tarjeta, { padding: 18 }]}>
          <Text style={estilos.etiqueta}>Correo</Text>
          <TextInput
            style={estilos.entrada}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="usuario@agrotraz.com"
            placeholderTextColor="#8a8f8a"
          />
          <Text style={estilos.etiqueta}>Contraseña</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[estilos.entrada, { paddingRight: 64 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!verClave}
              placeholder="••••••••"
              placeholderTextColor="#8a8f8a"
              onSubmitEditing={entrar}
            />
            <TouchableOpacity
              onPress={() => setVerClave((v) => !v)}
              style={{ position: 'absolute', right: 12, top: 12 }}
            >
              <Text style={{ color: '#2f7a3d', fontWeight: '700' }}>
                {verClave ? 'Ocultar' : 'Ver'}
              </Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={estilos.mensajeError}>{error}</Text>}

          <TouchableOpacity style={estilos.boton} onPress={entrar} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={estilos.botonTexto}>Entrar</Text>}
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: '#7ea08a', fontSize: 12, marginTop: 4 }}>
          El catálogo se descarga con internet{'\n'}y las evaluaciones se guardan sin conexión
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
