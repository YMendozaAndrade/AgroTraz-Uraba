export function fechaLocal(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function hoyLocal() {
  return fechaLocal(new Date());
}
