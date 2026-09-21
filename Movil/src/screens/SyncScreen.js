import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { estilos } from '../estilos';
import { contarPendientes, listarFincas, listarLotes } from '../db';
import { hayConexion, descargarCatalogo, sincronizarPendientes } from '../sync';

export default function SyncScreen({ token, alSincronizar }) {
  const [enLinea, setEnLinea] = useState(null);
  const [pendientes, setPendientes] = useState(0);
  const [catalogo, setCatalogo] = useState({ fincas: 0, lotes: 0 });
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function refrescar() {
    try {
      setEnLinea(await hayConexion());
    } catch {
      setEnLinea(false);
    }
    setPendientes(contarPendientes());
    setCatalogo({ fincas: listarFincas().length, lotes: listarLotes().length });
  }

  useEffect(() => { refrescar(); }, []);

  async function descargar() {
    setTrabajando(true);
    setMensaje(null);
    try {
      const r = await descargarCatalogo(token);
      setMensaje({ tipo: 'ok', texto: `Catálogo descargado: ${r.fincas} fincas, ${r.lotes} lotes` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setTrabajando(false);
      refrescar();
    }
  }

  async function sincronizar() {
    setTrabajando(true);
    setMensaje(null);
    try {
      const r = await sincronizarPendientes(token);
      if (r.total === 0) {
        setMensaje({ tipo: 'ok', texto: 'Nada pendiente por sincronizar' });
      } else if (r.errores.length === 0) {
        setMensaje({ tipo: 'ok', texto: `${r.subidas} evaluaciones sincronizadas` });
      } else {
        setMensaje({ tipo: 'error', texto: `${r.subidas}/${r.total} sincronizadas. ${r.errores[0]}` });
      }
      if (alSincronizar) alSincronizar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setTrabajando(false);
      refrescar();
    }
  }

  return (
    <ScrollView style={estilos.pantalla}>
      <Text style={estilos.titulo}>Sincronización</Text>
      <Text style={estilos.subtitulo}>Requiere internet solo para este paso</Text>

      <View style={estilos.tarjeta}>
        <Text style={estilos.itemTitulo}>
          {enLinea == null ? '…' : enLinea ? '🟢 En línea' : '⚪ Sin conexión'}
        </Text>
        <Text style={estilos.itemDim}>Pendientes por subir: {pendientes}</Text>
        <Text style={estilos.itemDim}>Catálogo: {catalogo.fincas} fincas · {catalogo.lotes} lotes</Text>
      </View>

      {!!mensaje && (
        <Text style={mensaje.tipo === 'ok' ? estilos.mensajeOk : estilos.mensajeError}>{mensaje.texto}</Text>
      )}

      <TouchableOpacity style={[estilos.boton, estilos.botonSec]} onPress={descargar} disabled={trabajando}>
        <Text style={estilos.botonTextoSec}>⬇ Descargar catálogo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={estilos.boton} onPress={sincronizar} disabled={trabajando || pendientes === 0}>
        {trabajando
          ? <ActivityIndicator color="#fff" />
          : <Text style={estilos.botonTexto}>⬆ Sincronizar ({pendientes})</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
