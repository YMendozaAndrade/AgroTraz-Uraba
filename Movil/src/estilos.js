import { StyleSheet } from 'react-native';

// Alto contraste y botones amplios para uso bajo luz solar directa.
export const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#f4f1e8', padding: 16 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#1d3b2a', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#5c7064', marginBottom: 12 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  etiqueta: { fontSize: 13, fontWeight: '700', color: '#25312a', marginBottom: 6, marginTop: 8 },
  entrada: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfdbc9',
    borderRadius: 10, padding: 12, fontSize: 16, color: '#25312a',
  },
  boton: {
    backgroundColor: '#2f7a3d', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 12,
  },
  botonSec: { backgroundColor: '#e8f2ec' },
  botonTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },
  botonTextoSec: { color: '#2f5a3e', fontSize: 16, fontWeight: '800' },
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1, borderColor: '#cfdbc9', borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 14, marginRight: 8, marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipActivo: { backgroundColor: '#1d3b2a', borderColor: '#1d3b2a' },
  chipTexto: { fontSize: 15, color: '#25312a' },
  chipTextoActivo: { color: '#fff', fontWeight: '700' },
  mensajeOk: { backgroundColor: '#dcefe0', color: '#1f6b3c', padding: 10, borderRadius: 8, marginTop: 8 },
  mensajeError: { backgroundColor: '#fbe0dc', color: '#b3352b', padding: 10, borderRadius: 8, marginTop: 8 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitulo: { fontSize: 15, fontWeight: '700', color: '#25312a' },
  itemDim: { fontSize: 12, color: '#5c7064' },
  miniatura: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#e8e6e1', alignItems: 'center' },
  tabActiva: { backgroundColor: '#1d3b2a' },
  tabTexto: { fontWeight: '700', color: '#25312a' },
  tabTextoActiva: { color: '#fff' },
});
