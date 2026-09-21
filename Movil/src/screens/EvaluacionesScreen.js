import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { estilos } from '../estilos';
import {
  listarLotes, guardarEvaluacionLocal, listarPendientes,
} from '../db';

const TIPOS = [
  { id: 'sigatoka', label: 'Sigatoka' },
  { id: 'moko_fusarium', label: 'Moko/Fusarium' },
  { id: 'picudo', label: 'Picudo' },
];

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default function EvaluacionesScreen() {
  const [lotes, setLotes] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [idLote, setIdLote] = useState(null);
  const [tipo, setTipo] = useState('sigatoka');
  const [yha, setYha] = useState('');
  const [sev, setSev] = useState('');
  const [adultos, setAdultos] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [foto, setFoto] = useState(null);
  const [gpsMsg, setGpsMsg] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [tomando, setTomando] = useState(false);

  function recargar() {
    setLotes(listarLotes());
    setPendientes(listarPendientes());
  }

  useEffect(recargar, []);

  const loteSel = lotes.find((l) => l.id_lote === idLote);

  async function usarGps() {
    setGpsMsg('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsMsg('Permiso de ubicación denegado');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(Number(pos.coords.latitude.toFixed(6)));
      setLng(Number(pos.coords.longitude.toFixed(6)));
      setGpsMsg('Ubicación capturada');
    } catch {
      setGpsMsg('No se pudo obtener la ubicación');
    }
  }

  async function tomarFoto() {
    setTomando(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setMensaje({ tipo: 'error', texto: 'Permiso de cámara denegado' });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.5, base64: true, exif: false,
      });
      if (!res.canceled && res.assets && res.assets[0] && res.assets[0].base64) {
        setFoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo tomar la foto' });
    } finally {
      setTomando(false);
    }
  }

  function guardar() {
    setMensaje(null);
    if (!idLote) {
      setMensaje({ tipo: 'error', texto: 'Seleccione el lote (descargue el catálogo en Sincronizar)' });
      return;
    }
    if (tipo === 'sigatoka' && (yha === '' || sev === '')) {
      setMensaje({ tipo: 'error', texto: 'Sigatoka requiere YHA y severidad' });
      return;
    }
    const ahora = new Date();
    guardarEvaluacionLocal({
      id_lote: idLote,
      lote: loteSel ? loteSel.nombre : '',
      tipo_evaluacion: tipo,
      fecha_evaluacion: hoy(),
      hora_evaluacion: ahora.toTimeString().slice(0, 5),
      latitud: lat,
      longitud: lng,
      fotografia: foto,
      yha: yha === '' ? null : Number(yha),
      indice_severidad: sev === '' ? null : Number(sev),
      numero_adultos: adultos === '' ? null : Number(adultos),
    });
    setMensaje({ tipo: 'ok', texto: 'Evaluación guardada en el equipo (pendiente de sincronizar)' });
    setYha(''); setSev(''); setAdultos(''); setFoto(null);
    recargar();
  }

  return (
    <ScrollView style={estilos.pantalla}>
      <Text style={estilos.titulo}>Evaluaciones</Text>
      <Text style={estilos.subtitulo}>Se guardan sin conexión y se sincronizan después</Text>

      <View style={estilos.tarjeta}>
        <Text style={estilos.etiqueta}>Lote ({lotes.length} en catálogo)</Text>
        <View style={estilos.fila}>
          {lotes.map((l) => (
            <TouchableOpacity
              key={l.id_lote}
              style={[estilos.chip, idLote === l.id_lote && estilos.chipActivo]}
              onPress={() => setIdLote(l.id_lote)}
            >
              <Text style={[estilos.chipTexto, idLote === l.id_lote && estilos.chipTextoActivo]}>
                {l.finca} / {l.nombre}
              </Text>
            </TouchableOpacity>
          ))}
          {lotes.length === 0 && (
            <Text style={estilos.itemDim}>Sin catálogo: vaya a Sincronizar y descargue con internet.</Text>
          )}
        </View>

        <Text style={estilos.etiqueta}>Tipo</Text>
        <View style={estilos.fila}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[estilos.chip, tipo === t.id && estilos.chipActivo]}
              onPress={() => setTipo(t.id)}
            >
              <Text style={[estilos.chipTexto, tipo === t.id && estilos.chipTextoActivo]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(tipo === 'sigatoka' || tipo === 'moko_fusarium') && (
          <View>
            {tipo === 'sigatoka' && (
              <View>
                <Text style={estilos.etiqueta}>YHA (hoja más joven afectada)</Text>
                <TextInput style={estilos.entrada} value={yha} onChangeText={setYha} keyboardType="numeric" placeholder="Ej. 5" />
              </View>
            )}
            <Text style={estilos.etiqueta}>Severidad (%)</Text>
            <TextInput style={estilos.entrada} value={sev} onChangeText={setSev} keyboardType="decimal-pad" placeholder="Ej. 6.5" />
          </View>
        )}
        {tipo === 'picudo' && (
          <View>
            <Text style={estilos.etiqueta}>Adultos en trampa</Text>
            <TextInput style={estilos.entrada} value={adultos} onChangeText={setAdultos} keyboardType="numeric" placeholder="Ej. 4" />
          </View>
        )}

        <Text style={estilos.etiqueta}>GPS {lat != null ? `· ${lat}, ${lng}` : ''}</Text>
        <TouchableOpacity style={[estilos.boton, estilos.botonSec]} onPress={usarGps}>
          <Text style={estilos.botonTextoSec}>📍 Usar mi ubicación</Text>
        </TouchableOpacity>
        {!!gpsMsg && <Text style={estilos.itemDim}>{gpsMsg}</Text>}

        <Text style={estilos.etiqueta}>Foto del síntoma</Text>
        <TouchableOpacity style={[estilos.boton, estilos.botonSec]} onPress={tomarFoto} disabled={tomando}>
          {tomando
            ? <ActivityIndicator color="#2f5a3e" />
            : <Text style={estilos.botonTextoSec}>📷 Tomar foto</Text>}
        </TouchableOpacity>
        {!!foto && <Image source={{ uri: foto }} style={estilos.miniatura} />}

        {!!mensaje && (
          <Text style={mensaje.tipo === 'ok' ? estilos.mensajeOk : estilos.mensajeError}>{mensaje.texto}</Text>
        )}
        <TouchableOpacity style={estilos.boton} onPress={guardar}>
          <Text style={estilos.botonTexto}>💾 Guardar en el equipo</Text>
        </TouchableOpacity>
      </View>

      <View style={estilos.tarjeta}>
        <Text style={estilos.etiqueta}>En el equipo ({pendientes.length})</Text>
        {pendientes.map((p) => (
          <View key={p.id_local} style={estilos.item}>
            <Text style={estilos.itemTitulo}>
              {p.lote} · {p.tipo_evaluacion} {p.sincronizada ? '✅' : '⏳'}
            </Text>
            <Text style={estilos.itemDim}>{p.fecha_evaluacion} {p.hora_evaluacion || ''}</Text>
          </View>
        ))}
        {pendientes.length === 0 && <Text style={estilos.itemDim}>Nada guardado todavía.</Text>}
      </View>
    </ScrollView>
  );
}
