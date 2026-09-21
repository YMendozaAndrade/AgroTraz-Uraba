import * as SQLite from 'expo-sqlite';

let db = null;

export function getDb() {
  if (!db) db = SQLite.openDatabaseSync('agrotraz.db');
  return db;
}

export function initDb() {
  const d = getDb();
  d.execSync(`
    CREATE TABLE IF NOT EXISTS catalogo_fincas (
      id_finca INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS catalogo_lotes (
      id_lote INTEGER PRIMARY KEY,
      id_finca INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      finca TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evaluaciones_pendientes (
      id_local INTEGER PRIMARY KEY AUTOINCREMENT,
      id_lote INTEGER NOT NULL,
      lote TEXT NOT NULL,
      tipo_evaluacion TEXT NOT NULL,
      fecha_evaluacion TEXT NOT NULL,
      hora_evaluacion TEXT,
      latitud REAL,
      longitud REAL,
      fotografia TEXT,
      yha INTEGER,
      indice_severidad REAL,
      numero_adultos INTEGER,
      sincronizada INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function guardarCatalogo(fincas, lotes) {
  const d = getDb();
  d.withTransactionSync(() => {
    d.runSync('DELETE FROM catalogo_lotes');
    d.runSync('DELETE FROM catalogo_fincas');
    for (const f of fincas) {
      d.runSync('INSERT INTO catalogo_fincas (id_finca, nombre) VALUES (?, ?)', [f.id_finca, f.nombre]);
    }
    for (const l of lotes) {
      d.runSync('INSERT INTO catalogo_lotes (id_lote, id_finca, nombre, finca) VALUES (?, ?, ?, ?)', [
        l.id_lote, l.id_finca, l.nombre, l.finca || '',
      ]);
    }
  });
}

export function listarFincas() {
  return getDb().getAllSync('SELECT * FROM catalogo_fincas ORDER BY nombre');
}

export function listarLotes() {
  return getDb().getAllSync('SELECT * FROM catalogo_lotes ORDER BY finca, nombre');
}

export function guardarEvaluacionLocal(ev) {
  const d = getDb();
  const r = d.runSync(
    `INSERT INTO evaluaciones_pendientes
      (id_lote, lote, tipo_evaluacion, fecha_evaluacion, hora_evaluacion, latitud, longitud,
       fotografia, yha, indice_severidad, numero_adultos, sincronizada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      ev.id_lote, ev.lote, ev.tipo_evaluacion, ev.fecha_evaluacion, ev.hora_evaluacion || null,
      ev.latitud ?? null, ev.longitud ?? null, ev.fotografia || null,
      ev.yha ?? null, ev.indice_severidad ?? null, ev.numero_adultos ?? null,
    ]
  );
  return r.lastInsertRowId;
}

export function listarPendientes() {
  return getDb().getAllSync(
    'SELECT * FROM evaluaciones_pendientes ORDER BY sincronizada ASC, id_local DESC'
  );
}

export function contarPendientes() {
  const r = getDb().getFirstSync('SELECT COUNT(*) AS n FROM evaluaciones_pendientes WHERE sincronizada = 0');
  return r ? r.n : 0;
}

export function marcarSincronizada(idLocal) {
  getDb().runSync('UPDATE evaluaciones_pendientes SET sincronizada = 1 WHERE id_local = ?', [idLocal]);
}
