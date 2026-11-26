# Laboratorio de seguridad con Node.js

Proyecto académico independiente para aprender desarrollo seguro y despliegue.
El nombre es provisional. Existe un servidor inicial; la aplicación de notas y
sus controles de seguridad todavía no están implementados.

## Objetivo

Construir y verificar una aplicación de notas con autenticación, autorización,
protección criptográfica y una base de datos, siguiendo el enunciado del curso.
La plataforma prevista para la práctica es Railway Free, sujeta a verificar los
límites del plan y la disponibilidad durante la evaluación.

## Estado

- [x] Investigación preliminar de despliegue.
- [x] Servidor inicial y ruta de salud del proceso.
- [ ] Diseño de datos y modelo de amenazas.
- [ ] Implementación y pruebas de la aplicación.
- [ ] Configuración de CI y despliegue en Railway.
- [ ] Comprobaciones de seguridad y documentación de evidencias reales.

El servidor inicial solo sirve para comprobar el arranque y la conectividad.
La ruta `/health` no comprueba una base de datos. Las credenciales, llaves y
archivos de entorno con valores reales no deben guardarse en el repositorio.

## Ejecución local

Con Node.js 24 instalado, ejecutá `npm ci` y luego `npm start`. La dirección
local predeterminada es `http://localhost:3000`; `/health` responde con el
estado del proceso. Para revisar la sintaxis, ejecutá `npm run check`.

## Flujo previsto

GitHub `main` → verificaciones de GitHub Actions → Railway → aplicación Node.js
y base de datos. Este flujo se configurará y comprobará durante el laboratorio.
