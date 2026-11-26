# Resguardo

Laboratorio académico de notas privadas. La aplicación está separada en dos
carpetas: interfaz React con Vite en `frontend/` y API Node.js con Express y
MySQL en `backend/`. Es independiente de Vértice CR.

## Estructura

```text
frontend/       React, Vite y estilos
backend/        API, seguridad, scripts y migraciones MySQL
docs/           investigación y documentación del laboratorio
package.json    comandos y workspaces npm
```

## Desarrollo local

1. Instalá Node.js 24 y MySQL 8.
2. Creá una base vacía para el laboratorio, por ejemplo `resguardo_dev`.
3. Copiá `.env.example` a `.env` y completá `DATABASE_URL`, `SESSION_SECRET`
   y `DATA_ENCRYPTION_KEY`. Conservá los valores secretos solo en `.env`.
4. Instalá las dependencias con `npm ci`.
5. Iniciá la API y Vite con `npm run dev`.

Vite queda en `http://localhost:5173`, Express en `http://localhost:3000` y
las solicitudes `/api` se envían a Express durante el desarrollo. La primera
vez que arranca la API, aplica en orden los archivos de `backend/migrations/`
y registra cada versión en `schema_migrations`.

En PowerShell podés crear el archivo local con:

```powershell
Copy-Item .env.example .env
```

`DATABASE_URL` tiene la forma
`mysql://usuario:contraseña@host:puerto/base`; codificá para URL cualquier
carácter especial en el usuario o la contraseña. `SESSION_SECRET` debe tener
al menos 32 caracteres. `DATA_ENCRYPTION_KEY` debe ser una clave aleatoria de
32 bytes en Base64; guardá una copia segura porque los datos cifrados dependen
de ella.

## Compilar y servir

```sh
npm run build
npm start
```

Express sirve `frontend/dist` y expone `/health` para comprobar la respuesta
del servicio. Railway usa el `package.json` de la raíz: el comando de
compilación es `npm run build` y el de arranque es `npm start`.

En Railway, conectá la rama `main` del repositorio y mantené el directorio raíz
del servicio en `/`. La base se conecta mediante `DATABASE_URL`; no copiés su
contraseña en el repositorio ni en el chat. En producción configurá también
`APP_BASE_URL` con el dominio HTTPS de la aplicación, `NODE_ENV=production`,
`SESSION_SECRET`, `DATA_ENCRYPTION_KEY` y `TRUST_PROXY=1`.

La recuperación de contraseña envía correo solo cuando hay un SMTP completo
configurado (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
`SMTP_SECURE` y `MAIL_FROM`). Ethereal sirve para recibir mensajes de prueba;
no es un proveedor de correo para cuentas reales.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia API y frontend en modo desarrollo |
| `npm run check` | Comprueba la sintaxis del backend |
| `npm run lint` | Ejecuta ESLint en ambos workspaces |
| `npm run build` | Compila React para producción |
| `npm test` | Ejecuta las pruebas de integración del backend |
| `npm run audit` | Revisa vulnerabilidades conocidas de dependencias |

Las pruebas de integración necesitan una base MySQL aislada (`lab_test`) y las
variables de prueba. No las ejecutés sobre datos personales. GitHub Actions
inicia MySQL temporal para las verificaciones automáticas.

## Primer administrador

Registrá primero una cuenta y luego ejecutá, en un entorno que tenga acceso a
la base:

```sh
node backend/scripts/crear-administrador.js correo-de-la-cuenta
```

El repositorio no incluye cuentas ni contraseñas predeterminadas.
