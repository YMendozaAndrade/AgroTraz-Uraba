function escapar(valor) {
  const v = valor === null || valor === undefined ? '' : String(valor);
  if (/[",\n;]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function descargarCSV(filas, columnas, nombreArchivo) {
  const encabezado = columnas.map((c) => escapar(c.label)).join(';');
  const lineas = filas.map((f) =>
    columnas.map((c) => escapar(f[c.key])).join(';')
  );
  const contenido = [encabezado, ...lineas].join('\r\n');

  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}