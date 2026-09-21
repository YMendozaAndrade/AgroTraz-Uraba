import AsyncStorage from '@react-native-async-storage/async-storage';

const K_TOKEN = 'agrotraz.token';
const K_USUARIO = 'agrotraz.usuario';

export async function guardarSesion(token, usuario) {
  await AsyncStorage.setItem(K_TOKEN, token);
  await AsyncStorage.setItem(K_USUARIO, JSON.stringify(usuario));
}

export async function leerSesion() {
  const token = await AsyncStorage.getItem(K_TOKEN);
  const raw = await AsyncStorage.getItem(K_USUARIO);
  if (!token) return null;
  return { token, usuario: raw ? JSON.parse(raw) : {} };
}

export async function cerrarSesion() {
  await AsyncStorage.removeItem(K_TOKEN);
  await AsyncStorage.removeItem(K_USUARIO);
}
