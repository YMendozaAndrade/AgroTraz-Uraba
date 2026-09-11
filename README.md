# AgroTraz Urabá

Plataforma web para el control fitosanitario y la trazabilidad de cosecha en la agroindustria del banano y plátano en la subregión de Urabá (Antioquia, Colombia).

## Contexto

Los pequeños y medianos productores de Urabá gestionan el monitoreo de plagas (Sigatoka Negra, Moko, Picudo Negro) mediante registros físicos en papel, lo que genera:

- Retardo en la detección de brotes fitosanitarios.
- Incumplimiento de los períodos de carencia agroquímica (riesgo de rechazo en puertos de destino).
- Ausencia de trazabilidad Lote-a-Caja ante reclamaciones de calidad o presencia de plagas.

AgroTraz Urabá resuelve estos problemas con una **plataforma web** para la administración, el análisis y la generación de informes, con una **app móvil Android Offline-First** planeada como siguiente fase para el trabajo en campo.

## Estado del sistema

| Módulo | Estado |
|--------|--------|
| Catastro y lotificación (fincas, códigos ICA, lotes, estado fitosanitario) | ✅ Implementado |
| Evaluaciones fitosanitarias (Sigatoka, Moko/Fusarium, Picudo) con estado automático del lote | ✅ Implementado |
| Control de agroquímicos y períodos de carencia | ✅ Implementado |
| Aplicaciones y bloqueo automático de cosecha/empaque por carencia | ✅ Implementado |
| Órdenes de corte con máquina de estados | ✅ Implementado |
| Códigos QR por lote y trazabilidad Lote-a-Caja | ✅ Implementado |
| Dashboard con filtros, indicadores fitosanitarios y top de lotes | ✅ Implementado |
| Reportes imprimibles (Producción, Fitosanitario, Trazabilidad, Inventario) | ✅ Implementado |
| App móvil Android Offline-First con ubicación GPS | 🔜 Roadmap |

## Requerimientos funcionales

| Código | Requerimiento | Prioridad | Estado |
|--------|---------------|-----------|--------|
| RF-01 | Gestión de catastro y lotificación (polígonos, densidad, cintas de enfunde) | Alta | ✅ |
| RF-02 | Monitoreo fitosanitario (Sigatoka, Moko, Picudo) con GPS y fotografías — módulo web; app móvil futura | Alta | ⚠️ Parcial (web) |
| RF-03 | Control de agroinsumos y cálculo automático del período de carencia | Alta | ✅ |
| RF-04 | Bloqueo automático de cosecha para lotes con carencia vigente | Alta | ✅ |
| RF-05 | Generación de códigos QR de trazabilidad por lote/caja | Media | ✅ |
| RF-06 | Dashboard analítico e informes oficiales ICA / GlobalG.A.P. | Media | ✅ (primeras versiones) |

## Requerimientos no funcionales clave

- **RNF-01 Offline-First (planeado):** almacenamiento local embebido (SQLite/IndexedDB) y sincronización automática con el servidor al recuperar conectividad, para el módulo móvil de campo.
- **RNF-02 Rendimiento:** validación de carencia en el servidor ≤ 1.5 s; generación de QR en respuesta inmediata.
- **RNF-03 Seguridad:** autenticación por roles (administrador, gerente, agrónomo, evaluador de campo, operador de empacadora), tokens JWT, registro público restringido y creación de usuarios solo por administración.
- **RNF-04 Usabilidad:** interfaz de alto contraste y botones amplios para uso bajo luz solar directa (aplica a la app móvil).

## Módulos del sistema

1. **Catastro Agrícola y Estructura de Fincas** – polígonos GeoJSON, área, densidad de plantas.
2. **Monitoreo Fitosanitario** – evaluación de Sigatoka Negra (Stover modificada), detección de Moko/Fusarium y conteo de Picudo; el estado del lote se recalcula y puede **desescalar** al mejorar los indicadores.
3. **Control de Agroinsumos y Algoritmo de Carencia** – registro de aplicaciones químicas y cálculo del período de carencia según ficha técnica.
4. **Programación de Cosecha y Trazabilidad QR** – filtrado automático de lotes aptos (bloqueo por carencia/cuarentena), pesaje, generación del código QR y trazabilidad Lote-a-Caja con historial de aplicaciones y evaluaciones.
5. **Dashboard Analítico e Informes** – indicadores por rango de fechas y por finca, alertas fitosanitarias, top de lotes y reportes imprimibles.

## Rol de acceso

| Rol | Permisos principales |
|-----|----------------------|
| Administrador | Gestión total, creación de usuarios, fincas, eliminación |
| Gerente | Administración de fincas, usuarios y estados |
| Agrónomo | Evaluaciones, aplicaciones, lotes, agroquímicos, reportes |
| Evaluador de campo | Registro de evaluaciones y lotes de sus fincas asignadas |
| Operador de empacadora | Generación de QR y registro de cajas |

## Arquitectura y tecnología

| Capa | Tecnología |
|------|------------|
| API / Backend | Node.js + Express |
| Base de datos | MySQL 8.0 |
| Frontend | React + Vite |
| Autenticación | JWT con roles |
| Reportes | Imprimibles web (PDF desde el navegador) |
| App móvil (roadmap) | Android 10+, GPS nativo, SQLite + sincronización |

### Ubicación en tiempo real (roadmap app móvil)

- **Captura:** GPS del dispositivo. En la web `navigator.geolocation`; en la app Android `expo-location` (React Native) con seguimiento en segundo plano.
- **Precisión:** el GPS puro tiene ~3–15 m al aire libre, suficiente para asociar al operario con su finca/lote.
- **Tiempo real:** WebSocket (Socket.IO) para transmitir posiciones en vivo al panel; **geofencing** (polígonos por lote) para detectar entrada/salida de los operarios ahorrando batería y datos.
- **Offline:** si no hay señal en campo, los puntos se acumulan en SQLite local y se sincronizan al volver la conectividad.

## Estructura del repositorio

```
App_AgroTraz/
├── Backend/
│   ├── index.js          # Punto de entrada de la API
│   └── src/
│       ├── db.js         # Conexión MySQL
│       ├── middleware/    # auth (JWT, roles)
│       └── routes/        # auth, usuarios, fincas, lotes, agroquimicos,
│                          # aplicaciones, evaluaciones, ordenes-corte, qr, asignaciones
├── Frontend/
│   └── src/
│       ├── auth/          # Login, registro
│       ├── app/           # Layout, estilos
│       ├── pages/         # Dashboard, Reportes, Fincas, Lotes, Evaluaciones,
│       │                  # Aplicaciones, Agroquimicos, OrdenesCorte, QrCajas
│       └── services/      # Cliente de la API
└── README.md
```

## Cómo ejecutar

### Backend

```bash
cd Backend
npm install
# configurar Backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET)
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

## Autores

- Yessica Paola Mendoza Andrade
- Esteban Solera Dilicheff

Politécnico Colombiano Jaime Isaza Cadavid – Facultad de Ingeniería, Sede Urabá.