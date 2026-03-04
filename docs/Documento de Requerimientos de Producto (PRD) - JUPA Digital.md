# Documento de Requerimientos de Producto (PRD) - JUPA Digital

**Versión:** 1.0  
**Fecha:** 19 de Febrero de 2026  
**Autor:** Manus AI (para Toby Tawachi)  
**Estado:** Borrador Inicial

---

## 1. Visión del Producto
**JUPA Digital** es una plataforma web diseñada para modernizar el proceso de evaluación del programa "Aprende Divirtiéndote" de la Fundación JUPA. Su objetivo principal es reemplazar las pruebas en papel por una experiencia digital interactiva en tablets, automatizando la corrección de preguntas de selección múltiple y facilitando la revisión de respuestas abiertas, ahorrando cientos de horas de trabajo manual y proporcionando datos inmediatos sobre el rendimiento estudiantil.

## 2. Objetivos del Proyecto
1.  **Digitalización Total:** Eliminar el uso de papel para las pruebas de 1º a 4º grado.
2.  **Automatización:** Calificar instantáneamente las preguntas de selección múltiple.
3.  **Eficiencia:** Reducir el tiempo de entrega de resultados de semanas a días (o horas).
4.  **Experiencia de Usuario:** Proveer una interfaz amigable y libre de estrés para niños de primaria (6-10 años).
5.  **Data Driven:** Generar reportes automáticos para JUPA sobre el impacto del programa.

## 3. Perfiles de Usuario

### 3.1 Estudiante (Niño/a de 1º a 4º Grado)
*   **Contexto:** Usa una tablet en la escuela bajo supervisión. Puede tener poca experiencia tecnológica.
*   **Necesidades:** Interfaz extremadamente simple, botones grandes, poco texto instructivo, feedback visual positivo.
*   **Flujo Principal:** Ingresar nombre -> Seleccionar Grado -> Leer Cuento -> Responder Preguntas -> Ver Pantalla de Éxito.

### 3.2 Administrador JUPA (Coordinador/a)
*   **Contexto:** Usa una laptop/desktop en la oficina o escuela.
*   **Necesidades:** Gestionar bancos de preguntas, habilitar/deshabilitar exámenes, descargar reportes Excel, revisar respuestas abiertas.
*   **Flujo Principal:** Login -> Dashboard de Métricas -> Gestión de Exámenes -> Revisión de Respuestas -> Exportar Data.

### 3.3 Maestro/Supervisor (Opcional en Fase 1)
*   **Contexto:** Supervisa el aula durante la prueba.
*   **Necesidades:** Desbloquear exámenes, ayudar a estudiantes con problemas técnicos (reset de sesión).

## 4. Requerimientos Funcionales

### 4.1 Módulo de Estudiante (Frontend Público)
*   **RF-01 Acceso Simplificado:** No requiere contraseña. El estudiante ingresa su Nombre, Apellido y selecciona su Escuela/Grado de una lista desplegable.
*   **RF-02 Selección de Examen:** El sistema muestra automáticamente el examen correspondiente al grado seleccionado o permite elegirlo si es un entorno mixto.
*   **RF-03 Motor de Examen:**
    *   Presentación del cuento/lectura con scroll suave.
    *   Preguntas de Selección Múltiple (una por pantalla o en lista, configurable).
    *   Preguntas de Desarrollo (campo de texto amplio).
    *   Indicador de progreso visual (barra o pasos).
*   **RF-04 Guardado Local (Resiliencia):** Las respuestas se guardan en `localStorage` cada 5 segundos para evitar pérdida de datos si falla el internet. Sincronización al volver la conexión.
*   **RF-05 Finalización:** Pantalla de celebración con confeti y mensaje motivacional. Bloqueo de re-envío.

### 4.2 Módulo de Administración (Backend Privado)
*   **RF-06 Autenticación Segura:** Login con correo y contraseña (o Google Auth) para personal de JUPA.
*   **RF-07 Gestión de Contenido (CMS):**
    *   Crear/Editar/Borrar Exámenes.
    *   Editor de texto enriquecido para los cuentos.
    *   Gestión de preguntas y asignación de puntajes.
*   **RF-08 Dashboard de Resultados:**
    *   Tabla filtrable por Escuela, Grado, Fecha.
    *   Visualización de notas automáticas (Selección Múltiple).
    *   Interfaz de calificación manual para preguntas abiertas.
*   **RF-09 Exportación:** Botón para descargar todos los resultados en formato CSV/Excel.

## 5. Requerimientos No Funcionales
*   **RNF-01 Rendimiento:** Carga inicial < 2 segundos en conexiones 3G (común en escuelas públicas).
*   **RNF-02 Compatibilidad:** Optimizado para tablets Android (Chrome) y iPad (Safari). Resolución mínima 1024x768.
*   **RNF-03 Escalabilidad:** Capaz de soportar 50-100 estudiantes concurrentes por escuela.
*   **RNF-04 Seguridad:** Datos de estudiantes protegidos (aunque no se recogen datos sensibles personales más allá del nombre).
*   **RNF-05 Disponibilidad:** Modo Offline-First (PWA) deseable para futuras versiones, pero robustez ante micro-cortes es obligatoria.

## 6. Métricas de Éxito (KPIs)
*   **Tasa de Finalización:** % de estudiantes que inician y terminan la prueba sin errores técnicos.
*   **Tiempo de Corrección:** Reducción del tiempo promedio de revisión por examen (vs. papel).
*   **Satisfacción:** Feedback cualitativo de los niños (¿fue divertido?) y maestros (¿fue fácil de administrar?).

## 7. Roadmap Tentativo (MVP)
*   **Fase 1 (Enero - Febrero):** Desarrollo del MVP con Next.js + Vercel Postgres. Carga de exámenes reales.
*   **Fase 2 (Marzo - Piloto):** Prueba en una escuela piloto con un grupo pequeño (20 estudiantes).
*   **Fase 3 (Abril - Ajustes):** Refinamiento basado en feedback del piloto.
*   **Fase 4 (Octubre - Lanzamiento):** Uso generalizado para la segunda evaluación del año.
