# Resguardo

Práctica académica de notas privadas con Node.js, Express y MySQL. Es un
proyecto independiente de Vértice CR.

## Estado

El código incluye registro, sesiones, notas privadas, perfil y panel de
administración. Las pruebas locales se ejecutaron con MySQL aislado; el
despliegue completo, el envío real de correo y los análisis externos de
seguridad aún deben verificarse. `/health` solo indica que el proceso responde.

## Uso local

1. Instalar Node.js 24 y MySQL 8.
2. Crear una base de datos independiente para el laboratorio.
3. Copiar `.env.example` a `.env` y configurar los valores. Nunca subir
   `.env`, contraseñas, llaves ni credenciales al repositorio.
4. Ejecutar `npm ci` y `npm start`. El servidor crea sus tablas en la base
   configurada y escucha el puerto definido por `PORT`.

`DATABASE_URL` tiene la forma `mysql://usuario:contraseña@host:puerto/base`;
los caracteres especiales en usuario o contraseña se codifican para URL.
`SESSION_SECRET` debe contener al menos 32 caracteres y
`DATA_ENCRYPTION_KEY` debe ser una llave aleatoria de 32 bytes codificada en
base64. Conservar la llave: si se pierde, los datos cifrados no se pueden leer.
No compartirla junto a respaldos ni registrarla en consola pública.

La recuperación por correo requiere configurar SMTP y `MAIL_FROM`. Mientras no
se configure un servicio real, la solicitud responde que no está disponible.
`APP_BASE_URL` debe ser la URL pública HTTPS real en producción.
`DATABASE_SSL=true` habilita TLS verificando el certificado; en Railway puede
usarse la red privada interna, según la configuración real.

Para habilitar el primer administrador, registrar una cuenta y ejecutar
`node scripts/crear-administrador.js correo-de-la-cuenta` en un entorno con
acceso a la base y las variables configuradas. No existen administradores ni
credenciales predeterminadas.

## Verificaciones

`npm run check` comprueba sintaxis. `npm test` exige `NODE_ENV=test`, un
MySQL local independiente llamado `lab_test` y variables de prueba; no lo
ejecutés contra datos reales. GitHub Actions propone un servicio temporal MySQL
para correr esas pruebas y auditar dependencias. Railway debe configurarse para
esperar a CI: agregar el flujo por sí solo no activa esa espera.

El informe de seguridad y las pruebas en producción están en `docs/`; las
evidencias no ejecutadas se identifican como pendientes.
