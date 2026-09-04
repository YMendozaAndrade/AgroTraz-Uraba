# AgroTraz Urabá

Plataforma web y móvil para el control fitosanitario y la trazabilidad de cosecha en la agroindustria del banano y plátano en la subregión de Urabá (Antioquia, Colombia).

## Contexto

Los pequeños y medianos productores de Urabá gestionan el monitoreo de plagas (Sigatoka Negra, Moko, Picudo Negro) mediante registros físicos en papel, lo que genera:

- Retardo en la detección de brotes fitosanitarios.
- Incumplimiento de los períodos de carencia agroquímica (riesgo de rechazo en puertos de destino).
- Ausencia de trazabilidad Lote-a-Caja ante reclamaciones de calidad o presencia de plagas.

AgroTraz Urabá resuelve estos problemas con un sistema híbrido **Offline-First** para el trabajo en campo y una plataforma **web** para la administración, análisis y generación de informes de auditoría (ICA y GlobalG.A.P.).

## Requerimientos funcionales

| Código | Requerimiento | Prioridad |
|--------|---------------|-----------|
| RF-01 | Gestión de catastro y lotificación (polígonos, densidad, cintas de enfunde) | Alta |
| RF-02 | Monitoreo fitosanitario Offline (Sigatoka, Moko, Picudo) con GPS y fotografías | Alta |
| RF-03 | Control de agroinsumos y cálculo automático del período de carencia | Alta |
| RF-04 | Bloqueo automático de cosecha para lotes con carencia vigente | Alta |
| RF-05 | Generación e impresión de códigos QR de trazabilidad por caja/estiba | Media |
| RF-06 | Dashboard analítico e informes oficiales ICA / GlobalG.A.P. | Media |

## Requerimientos no funcionales clave

- **RNF-01 Offline-First:** almacenamiento local embebido (SQLite/IndexedDB) y sincronización automática con el servidor al recuperar conectividad.
- **RNF-02 Rendimiento:** validación de carencia en el servidor ≤ 1.5 s; generación de QR ≤ 500 ms por etiqueta.
- **RNF-03 Seguridad:** autenticación por roles (Administrador, Agrónomo, Evaluador de Campo, Operador de Empacadora) y log de auditoría inalterable para modificaciones de carencia.
- **RNF-04 Usabilidad:** interfaz móvil de alto contraste y botones > 48px para uso bajo luz solar directa y con guantes.

## Módulos del sistema

1. **Catastro Agrícola y Estructura de Fincas** – polígonos GeoJSON, área, densidad de plantas y calendario de cintas por semana de floración.
2. **Monitoreo Fitosanitario en Campo (App Móvil)** – evaluación de Sigatoka Negra (Stover modificada), detección de Moko/Fusarium con fotografía obligatoria y conteo de Picudo.
3. **Control de Agroinsumos y Algoritmo de Carencia** – registro de aplicaciones químicas y cálculo del período de carencia según ficha técnica.
4. **Programación de Cosecha y Trazabilidad QR** – filtrado automático de lotes aptos, pesaje, generación e impresión de etiquetas QR.
5. **Dashboard Analítico e Informes** – mapas de calor, alertas tempranas y exportación de reportes ICA / GlobalG.A.P. en PDF y Excel.

## Arquitectura y tecnología sugerida

| Capa | Tecnología |
|------|------------|
| API / Backend | Node.js (v18+) o ASP.NET Core 8 |
| Base de datos | MySQL 8.0 |
| App móvil | Android 10+ (offline-first, SQLite/IndexedDB, Service Worker) |
| Impresión | Etiquetas térmicas ZPL/EPL vía Bluetooth o LAN |
| Reportes | PDF y Excel (ICA / GlobalG.A.P.) |

## Estructura del repositorio

```
App_AgroTraz/
├── Backend/          # API y lógica de negocio
├── Frontend/         # Aplicación web
├── docs/             # Documentación y análisis del proyecto
└── README.md
```

## Documentación

El análisis técnico completo del sistema se encuentra en [`docs/AgroTraz Uraba - Analisis.pdf`](docs/AgroTraz%20Uraba%20-%20Analisis.pdf), que incluye la especificación de casos de uso, prerrequisitos, correquisitos, normatividad (ICA, GlobalG.A.P., Rainforest Alliance) y controles de trazabilidad.

## Autores

- Yessica Paola Mendoza Andrade
- Esteban Solera Dilicheff

Politécnico Colombiano Jaime Isaza Cadavid – Facultad de Ingeniería, Sede Urabá.
