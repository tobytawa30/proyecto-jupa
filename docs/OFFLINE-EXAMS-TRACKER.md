# Tracker de Implementacion - Examenes Offline

**Fecha inicio:** 10 de Marzo de 2026
**Estado:** En Progreso
**Version:** 1.0
**Objetivo:** Permitir que los estudiantes descarguen examenes, los realicen sin conexion, guarden todo localmente y sincronicen despues con la nube.

---

## Vision General

### Resultado esperado
- El dispositivo puede descargarse previamente los examenes activos y la data minima requerida.
- El estudiante puede iniciar, responder, pausar, cerrar y completar el examen sin internet.
- Las respuestas terminadas quedan guardadas localmente hasta que haya conexion.
- La sincronizacion con la nube es segura, reintentable e idempotente.
- Los resultados finales siguen viviendo en la base de datos central y en el panel admin.

### Flujo actual que debe cambiar
- `src/app/page.tsx` depende de `GET /api/schools`, `GET /api/exams` y `POST /api/sessions` en tiempo real.
- `src/app/(public)/examen/[examId]/page.tsx` mantiene respuestas solo en estado React.
- `src/app/api/submit/route.ts` exige que la sesion exista ya en Postgres.
- `src/hooks/useExam.ts` existe, pero no esta integrado en el flujo publico actual.
- No existe `IndexedDB`, service worker, cache manifest ni cola de sincronizacion.

---

## Decisiones Tecnicas

| Tema | Decision |
|------|----------|
| Persistencia offline | `IndexedDB` como almacenamiento principal |
| Cache liviano UI | `localStorage` solo si hace falta para flags pequenos |
| Inicio offline | Permitido si el examen y catalogos ya fueron descargados |
| Origen de verdad durante el examen | Estado local del dispositivo |
| Calificacion final | Servidor |
| Identificador offline | `offlineAttemptId` generado en cliente |
| Sincronizacion | Automatica al recuperar conexion + boton manual |
| Prevencion de duplicados | Idempotencia por `offlineAttemptId` |
| Versionado examen | Snapshot/version del examen descargado |
| Estrategia PWA | Service worker para shell/cache, IndexedDB para datos |

---

## Alcance Funcional

### Incluido
- Descarga previa de examenes activos y escuelas.
- Inicio de examen completamente offline.
- Auto guardado local de respuestas y progreso.
- Reanudacion de examen tras cerrar o recargar.
- Finalizacion offline.
- Cola de sincronizacion diferida.
- Reintentos al volver la conexion.
- Visualizacion de estado: offline, pendiente, sincronizado, error.

### No incluido en la primera entrega
- Sincronizacion en background usando APIs del navegador dependientes de soporte parcial.
- Edicion offline del contenido del examen por parte del admin.
- Resolucion compleja de conflictos multi-dispositivo para una misma sesion.
- Reportes avanzados de telemetria operativa.

---

## Riesgos Principales

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Cambios de examen despues de descargar | Calificacion inconsistente | Guardar snapshot/version del examen usado |
| Doble sincronizacion del mismo intento | Duplicados en resultados | `offlineAttemptId` unico e idempotencia backend |
| Cierre del navegador durante el examen | Perdida de respuestas | Guardar cada cambio en IndexedDB |
| Dispositivo sin datos precargados | Imposibilidad de iniciar offline | Pantalla de readiness y descarga previa obligatoria |
| Fallo parcial de sincronizacion | Estado inconsistente | Cola con estados y reintentos seguros |
| Limites de almacenamiento del navegador | Datos incompletos | Validar tamano, cache minima y manejo de errores |

---

## Arquitectura Objetivo

### Frontend
- Pagina inicial con modo online/offline y estado de disponibilidad local.
- Runtime de examen controlado por un store offline-aware.
- Persistencia local usando repositorios sobre IndexedDB.
- Estado visual para cola de sincronizacion.

### Backend
- Endpoints para manifest/cache.
- Endpoints para reconciliar sesion offline y sincronizar respuestas.
- Logica compartida de grading para flujo online y flujo offline.
- Proteccion idempotente para evitar duplicados.

### Datos locales
- `cachedExams`
- `cachedSchools`
- `offlineAttempts`
- `offlineAnswers`
- `syncQueue`
- `syncMeta`

### Datos remotos
- Extender `student_sessions` con metadata offline.
- Reusar `exam_answers` para respuestas finales ya sincronizadas.
- Opcional: almacenar snapshot o referencia versionada del examen utilizado.

---

## Fases de Implementacion

### Fase 1 - Fundaciones y modelo de datos

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.1 | Definir contratos TS para examen offline, intento offline y cola de sync | ✅ Completado | `src/lib/offline/types.ts` |
| 1.2 | Diseñar esquema IndexedDB | 🔄 En progreso | Base creada en `src/lib/offline/indexed-db.ts` |
| 1.3 | Extender esquema DB con `offlineAttemptId` y metadata de sync | ✅ Completado | Schema actualizado + SQL inicial |
| 1.4 | Extraer logica compartida de grading fuera de `submit` | ✅ Completado | `src/lib/exams/grading.ts` |
| 1.5 | Definir estrategia de version/snapshot del examen | ⬜ Pendiente | Recomendado: snapshot por intento |

### Fase 2 - Preparacion offline del dispositivo

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 2.1 | Crear `GET /api/offline/cache-manifest` | ✅ Completado | Endpoint base implementado |
| 2.2 | Crear utilidades frontend para descargar y guardar catalogos | ✅ Completado | Repositorios cache + descarga de examenes implementados |
| 2.3 | Mostrar estado de disponibilidad offline en `src/app/page.tsx` | ✅ Completado | Estado visual online/offline y readiness |
| 2.4 | Agregar accion de descarga/preparacion del dispositivo | ✅ Completado | Boton de preparacion implementado |
| 2.5 | Validar que no se permita inicio offline sin datos cacheados | ✅ Completado | Mensaje y bloqueo implementados en inicio |

### Fase 3 - Runtime offline del examen

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 3.1 | Crear store/hook offline para progreso del examen | 🔄 En progreso | Base implementada con repositorios + estado persistente |
| 3.2 | Migrar `src/app/(public)/examen/[examId]/page.tsx` a persistencia local | ✅ Completado | Flujo ya lee y escribe localmente |
| 3.3 | Guardar respuestas al seleccionar opcion | ✅ Completado | `saveOfflineAnswer` integrado |
| 3.4 | Guardar `currentQuestionIndex`, story state y timestamps | ✅ Completado | Persistencia de navegacion y story state |
| 3.5 | Reanudar examen despues de refresh/cierre | ✅ Completado | Reanudacion desde `attemptId` |
| 3.6 | Marcar intento como `completed_local` al finalizar sin internet | ✅ Completado | Cola y estado local al finalizar |

### Fase 4 - Sincronizacion backend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 4.1 | Crear `POST /api/offline/sync/session` | ✅ Completado | Endpoint base implementado |
| 4.2 | Crear `POST /api/offline/sync/exam` | ✅ Completado | Endpoint base implementado |
| 4.3 | Garantizar idempotencia ante reintentos | ✅ Completado | Reuso seguro de sesion + persistencia atomica |
| 4.4 | Registrar `syncedAt`, `source` y metadata final | ✅ Completado | Backend y metadata local actualizados |
| 4.5 | Manejar mismatch de version del examen | ✅ Completado | Sync devuelve `409` si el examen cambio |

### Fase 5 - Sincronizacion frontend

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 5.1 | Crear cola local `syncQueue` | ✅ Completado | Repositorio y jobs persistentes implementados |
| 5.2 | Crear procesador de sincronizacion | ✅ Completado | `runAllPendingSyncJobs` y runner base |
| 5.3 | Detectar reconexion del navegador | ✅ Completado | Listener online/offline en inicio |
| 5.4 | Agregar boton manual `Sincronizar ahora` | ✅ Completado | Boton en `src/app/page.tsx` |
| 5.5 | Marcar intentos como `pending`, `running`, `failed`, `synced` | ✅ Completado | Estados manejados en cola e intento |
| 5.6 | Mostrar errores accionables de sincronizacion | ✅ Completado | Incluye conflicto de version y retry manual |

### Fase 6 - PWA y cache de app

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 6.1 | Agregar manifest web app | ✅ Completado | `src/app/manifest.ts` |
| 6.2 | Registrar service worker | ✅ Completado | Registro cliente en layout |
| 6.3 | Cachear app shell y assets esenciales | ✅ Completado | `public/sw.js` |
| 6.4 | Cachear respuestas de examenes descargados | ✅ Completado | Cache runtime de `/api/exams*` |
| 6.5 | Definir invalidacion por version de examen | ✅ Completado | Deteccion de mismatch en sync + preparacion guiada |

### Fase 7 - UI/UX operativa

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 7.1 | Mostrar estado `Listo para offline` | ✅ Completado | Home con readiness y examenes descargados |
| 7.2 | Mostrar estado `Pendiente de sincronizar` | ✅ Completado | Home y pantalla final muestran estado |
| 7.3 | Mostrar estado `Sincronizado` | ✅ Completado | Badges y pantalla final actualizados |
| 7.4 | Mostrar estado `Error de sincronizacion` | ✅ Completado | Cola del dispositivo muestra errores y retry |
| 7.5 | Agregar vista simple para intentos pendientes en el dispositivo | ✅ Completado | Cola del dispositivo en `src/app/page.tsx` |

### Fase 8 - QA, hardening y rollout

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 8.1 | Probar inicio online y finalizacion offline | 🔄 En progreso | Caso documentado en matriz QA |
| 8.2 | Probar inicio totalmente offline con datos precargados | 🔄 En progreso | Caso documentado en matriz QA |
| 8.3 | Probar refresh durante el examen | 🔄 En progreso | Caso documentado en matriz QA |
| 8.4 | Probar multiples intentos pendientes en un mismo dispositivo | 🔄 En progreso | Caso documentado en matriz QA |
| 8.5 | Probar duplicados de sincronizacion | 🔄 En progreso | Caso documentado en matriz QA |
| 8.6 | Probar examenes editados luego de descargar | 🔄 En progreso | Caso documentado en matriz QA |
| 8.7 | Probar errores por cuota o storage bloqueado | 🔄 En progreso | Caso documentado en matriz QA |
| 8.8 | Activar feature flag y rollout controlado | ⬜ Pendiente | |

---

## Matriz QA Offline

| ID | Escenario | Preparacion | Resultado esperado | Estado |
|----|-----------|-------------|--------------------|--------|
| QA-01 | Preparar dispositivo offline | Conectividad disponible y examenes activos | Se descargan escuelas, examenes y shell; home muestra `Listo para offline` | ✅ Documentado |
| QA-02 | Iniciar examen online | Dispositivo preparado y con internet | Se crea intento local, abre examen y queda visible en cola como `En progreso` | ✅ Documentado |
| QA-03 | Iniciar examen sin internet con cache previa | Dispositivo preparado, modo offline activo | Se puede abrir el examen usando cache local | ✅ Documentado |
| QA-04 | Bloqueo de inicio offline sin cache | Limpiar storage y poner modo offline | Home bloquea inicio y muestra error de preparacion requerida | ✅ Documentado |
| QA-05 | Auto guardado de respuestas | Contestar varias preguntas | Respuestas persisten al navegar entre preguntas | ✅ Documentado |
| QA-06 | Refresh o cierre durante examen | Contestar parcialmente y recargar | El intento aparece en cola y puede reanudarse sin perder progreso | ✅ Documentado |
| QA-07 | Finalizar examen offline | Completar examen sin internet | Se guarda localmente, se crea job `pending` y la pantalla final indica sync pendiente | ✅ Documentado |
| QA-08 | Sincronizacion manual | Tener intentos `pending` y recuperar internet | Boton `Sincronizar pendientes` procesa cola y cambia estado a `Sincronizado` | ✅ Documentado |
| QA-09 | Sincronizacion automatica al reconectar | Tener intentos `pending` y volver online | Listener dispara sync y actualiza la cola del dispositivo | ✅ Documentado |
| QA-10 | Reintento de intento fallido | Forzar error de sync y luego restaurar conectividad | Boton `Reintentar sync` reprocesa el intento | ✅ Documentado |
| QA-11 | Duplicado de sincronizacion | Reintentar el mismo intento sincronizado | Backend no duplica sesion ni respuestas por `offlineAttemptId` | ✅ Documentado |
| QA-12 | Conflicto por version de examen | Descargar examen, editarlo en admin y luego sincronizar | API responde `409`, intento queda `failed` y el error se muestra en cola | ✅ Documentado |
| QA-13 | Multiples intentos en un mismo dispositivo | Completar varios examenes antes de reconectar | Todos los intentos aparecen en cola y se procesan en orden | ✅ Documentado |
| QA-14 | Shell offline PWA | Visitar la app, luego desconectar | La app carga home/examen/completo desde cache del service worker | ✅ Documentado |
| QA-15 | Storage bloqueado o con cuota insuficiente | Simular restriccion del navegador | Se captura error y se deja evidencia operativa para soporte | ✅ Documentado |

### Checklist de ejecucion manual

- [x] Definir escenarios criticos de negocio para flujo offline.
- [x] Definir escenarios de resiliencia: refresh, reconexion, retry, duplicados.
- [x] Definir escenario de conflicto por version de examen.
- [x] Definir escenario de shell offline con service worker.
- [ ] Ejecutar matriz completa en navegador de escritorio.
- [ ] Ejecutar matriz completa en tablet.
- [ ] Ejecutar pruebas con DevTools en modo offline y online intermitente.
- [ ] Validar resultados sincronizados desde panel admin.

### Procedimiento recomendado de prueba manual

1. Preparar el dispositivo desde `src/app/page.tsx` con conexion.
2. Confirmar que la cola del dispositivo inicia vacia y el estado sea `Listo para offline`.
3. Iniciar un examen, responder parcialmente y recargar para validar reanudacion.
4. Terminar un examen sin internet y verificar estado `Pendiente de sincronizar`.
5. Recuperar conexion y probar sync automatico y manual.
6. Repetir con multiples intentos acumulados.
7. Editar un examen en admin despues de descargarlo y confirmar fallo por version.
8. Revisar resultados sincronizados en `src/app/(admin)/resultados/page.tsx`.

---

## Backlog Tecnico Detallado

### Backend
- [x] Crear tipos compartidos para payloads offline.
- [x] Crear helper para reconciliar sesion offline.
- [x] Crear helper reutilizable para grading.
- [x] Actualizar `src/lib/db/schema.ts` con nuevos campos de sesion.
- [x] Crear migracion de base de datos.
- [x] Implementar `src/app/api/offline/cache-manifest/route.ts`.
- [x] Implementar `src/app/api/offline/sync/session/route.ts`.
- [x] Implementar `src/app/api/offline/sync/exam/route.ts`.
- [x] Reusar logica de submit en online/offline.
- [x] Validar reintentos y evitar respuestas duplicadas.

### Frontend - almacenamiento y dominio
- [x] Crear `src/lib/offline/*` para repositorios IndexedDB.
- [x] Crear tipos para examenes cacheados, intentos y cola.
- [x] Crear helpers para `navigator.onLine` y estados de conectividad.
- [x] Crear generacion estable de `offlineAttemptId`.
- [x] Crear store de examen offline con persistencia.

### Frontend - flujo estudiante
- [x] Adaptar `src/app/page.tsx` para readiness offline.
- [x] Agregar boton/accion de descarga de examenes.
- [x] Permitir inicio sin red si existe cache local.
- [x] Adaptar `src/app/(public)/examen/[examId]/page.tsx` a store persistente.
- [x] Adaptar `src/app/(public)/completo/page.tsx` para status de sync.
- [x] Agregar UI de reanudacion de examen pendiente.

### Sync
- [x] Crear cola local y estados de job.
- [x] Ejecutar sync al recuperar conexion.
- [x] Agregar accion manual de sync.
- [x] Guardar ultimo resultado de sincronizacion.
- [x] Permitir reintento de jobs fallidos.

### PWA
- [x] Crear `manifest.webmanifest`.
- [x] Registrar service worker en cliente.
- [x] Definir estrategia cache-first / network-first segun recurso.
- [x] Confirmar funcionamiento offline del shell principal.

### QA
- [x] Documentar matriz de pruebas.
- [ ] Probar desktop y tablet.
- [ ] Probar escenarios sin wifi ni datos.
- [ ] Probar app cerrada y reabierta.
- [ ] Probar sincronizacion tardia en lote.

---

## Archivos Candidatos a Cambiar

### Ya existentes
- `src/app/page.tsx`
- `src/app/(public)/examen/[examId]/page.tsx`
- `src/app/(public)/completo/page.tsx`
- `src/app/api/sessions/route.ts`
- `src/app/api/submit/route.ts`
- `src/app/api/exams/route.ts`
- `src/app/api/exams/[id]/route.ts`
- `src/lib/db/schema.ts`
- `src/hooks/useExam.ts`
- `src/hooks/useLocalStorage.ts`
- `next.config.ts`
- `package.json`

### Nuevos probables
- `src/lib/offline/types.ts`
- `src/lib/offline/indexed-db.ts`
- `src/lib/offline/cache-repository.ts`
- `src/lib/offline/attempt-repository.ts`
- `src/lib/offline/sync-queue.ts`
- `src/lib/offline/sync-runner.ts`
- `src/lib/offline/connectivity.ts`
- `src/lib/exams/grading.ts`
- `src/lib/exams/session-sync.ts`
- `src/app/api/offline/cache-manifest/route.ts`
- `src/app/api/offline/sync/session/route.ts`
- `src/app/api/offline/sync/exam/route.ts`
- `public/manifest.webmanifest`
- `public/sw.js`

---

## Definition of Done

- Un dispositivo preparado puede iniciar y terminar examenes sin conexion.
- Las respuestas no se pierden al cerrar o refrescar.
- La sincronizacion posterior crea una sola sesion remota por intento offline.
- La calificacion y resultados llegan correctamente al panel admin.
- El usuario ve claramente si el dispositivo esta listo, pendiente o sincronizado.
- Existe validacion manual en pruebas reales de conectividad intermitente.

---

## Registro de Avance

### 10/03/2026
- [x] Analisis del flujo actual online-only completado.
- [x] Definido enfoque offline-first con `IndexedDB` + cola de sync.
- [x] Definido uso de `offlineAttemptId` para idempotencia.
- [x] Creado tracker detallado de implementacion.
- [x] Inicio de implementacion tecnica.
- [x] Creada base backend para manifest offline y endpoints de sync.
- [x] Extraida logica compartida de grading para submit online/offline.
- [x] Creada base frontend para IndexedDB, repositorios offline y sync queue.
- [x] Actualizada la pagina de inicio para preparar dispositivo, reanudar examenes y sincronizar pendientes.
- [x] Migrado el runtime del examen a persistencia offline con reanudacion local.
- [x] Build de produccion y typecheck completados correctamente.
- [x] Agregado soporte PWA base con manifest y service worker.
- [x] Agregada cola operativa del dispositivo con reanudar y reintentar sincronizacion.
- [x] Agregada deteccion de conflicto por version del examen y metadata de ultimo sync.
- [x] Corregida la sincronizacion atomica para evitar duplicados de respuestas y carreras por `offlineAttemptId`.
- [x] Corregido el procesamiento de cola para no bloquear otros intentos por un fallo aislado.
- [x] Endurecida la validacion de readiness offline y el warm-up de rutas del PWA.

---

## Leyenda

- ⬜ Pendiente
- 🔄 En progreso
- ✅ Completado
- ❌ Bloqueado
