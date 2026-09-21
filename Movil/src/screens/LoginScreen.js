import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { guardarSesion } from '../auth';
import { estilos } from '../estilos';

export default function LoginScreen({ alEntrar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>🌱 AgroTraz Campo</Text>
      <Text style={estilos.subtitulo}>Evaluaciones fitosanitarias sin conexión</Text>
      <Text style={estilos.etiqueta}>Correo</Text>
      <TextInput
        style={estilos.entrada}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="usuario@agrotraz.com"
      />
      <Text style={estilos.etiqueta}>Contraseña</Text>
      <TextInput
        style={estilos.entrada}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      {!!error && <Text style={estilos.mensajeError}>{error}</Text>}
      <TouchableOpacity style={estilos.boton} onPress={entrar} disabled={cargando}>
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={estilos.botonTexto}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}
