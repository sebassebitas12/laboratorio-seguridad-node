# Informe de seguridad: plantilla de evidencias

**Estado general: pendiente de verificaciones locales y del despliegue.** La
siguiente matriz traduce los requisitos del laboratorio a controles y pruebas.
No se presume que un control esté implementado ni que una prueba haya pasado.
Registrar fecha, entorno, comando o pasos y vínculo a evidencia propia para
cada resultado; evitar capturas con tokens, correos, datos sensibles o llaves.

| OWASP Top 10:2025 | Riesgo y control previsto | Evidencia requerida | Estado |
| --- | --- | --- | --- |
| A01 Control de acceso defectuoso | Autorización por rol en servidor y consultas restringidas por propietario; restringir destinos si existen peticiones salientes | Usuario A no lee, edita ni elimina notas de B; usuario sin rol no accede al panel | Pendiente |
| A02 Configuración de seguridad incorrecta | Helmet y CSP, sin `X-Powered-By`, CORS apropiado, configuración de producción y errores genéricos | Resultado de SecurityHeaders, objetivo A o superior; revisión de cabeceras y errores | Pendiente |
| A03 Fallos en cadena de suministro | Lockfile versionado, `npm ci`, auditoría, actualización de dependencias | `npm audit` sin hallazgos altos/críticos y configuración Dependabot o Renovate | Pendiente |
| A04 Fallos criptográficos | Argon2id para contraseñas; AES-256-GCM para datos recuperables; llaves fuera de Git y TLS | Hash y ciphertext en BD sin secretos en capturas; informe SSL Labs | Pendiente |
| A05 Inyección | Validación por esquema, SQL parametrizado, salida tratada de forma segura y CSP | Intentos propios de SQLi y XSS rechazados o neutralizados | Pendiente |
| A06 Diseño inseguro | Modelo de amenazas, límites de tamaño y cantidad de notas, diseño de recuperación | Diagrama STRIDE y pruebas de límites y casos de abuso | Pendiente |
| A07 Fallos de autenticación | Límites de intentos y bloqueo progresivo; errores genéricos; sesión renovada y expirable | Serie de intentos fallidos devuelve 429; verificación de expiración e invalidación | Pendiente |
| A08 Fallos de integridad de software o datos | CI que ejecuta pruebas antes de desplegar; no deserializar datos no confiables; SRI si se usan scripts de CDN | Ejecución real de CI y configuración que impide deploy fallido; SRI cuando corresponda | Pendiente |
| A09 Fallos de registro y alerta | Eventos útiles de acceso y roles en JSON, sin secretos; alerta ante fallos consecutivos | Muestra protegida de logs, panel admin y alerta verificada | Pendiente |
| A10 Manejo incorrecto de condiciones excepcionales | Manejador de errores, fallo seguro, timeouts y gestión de promesas no manejadas | Error inducido solo en ambiente propio: respuesta genérica y registro interno | Pendiente |

Fuente de categorías: [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/).
El Top 10 es una guía de priorización, no una certificación ni una garantía de
ausencia de vulnerabilidades.

## Decisiones criptográficas y recuperación

- **Contraseñas:** Argon2id con sal, al menos 19 MiB de memoria, dos iteraciones y
  paralelismo 1; alternativa del enunciado: bcrypt con costo 12 o superior.
- **Notas y dato sensible:** AES-256-GCM, IV aleatorio nuevo de 12 bytes por
  cifrado y etiqueta de autenticación de 16 bytes. La base de datos conserva los
  componentes necesarios para descifrar, sin conservar la llave junto a ellos.
- **Recuperación:** 32 bytes aleatorios criptográficos para el token; se almacena
  SHA-256 del token, no el token; vencimiento y consumo único.
- **Llaves:** valor secreto generado externamente y conservado en la
  configuración protegida de cada entorno, sin subirlo al repositorio.

Estas son decisiones requeridas o previstas: revisar los parámetros y la
implementación real antes de afirmar que se cumplen. El formato de ciphertext
debe identificarse sin revelar contenido en la evidencia. Referencias:
[OWASP contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[OWASP cifrado](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).

### Pérdida y rotación de llaves

Si se pierde la única llave capaz de descifrar una nota, se pierde el acceso a
su contenido, aunque exista un respaldo de la base de datos. Un respaldo útil
requiere recuperar la llave correspondiente desde un lugar protegido y separado.
Para rotar sin perder datos: inventariar y versionar llaves; habilitar una llave
nueva para escrituras; conservar protegidas las antiguas durante la transición;
descifrar con la versión antigua y volver a cifrar con la nueva usando IV nuevo;
comprobar integridad y restauración; retirar las antiguas solo cuando ya no se
necesiten para datos ni respaldos. Esto es un **plan de análisis**, no una
afirmación de que la rotación automática está implementada.

## Evidencias y riesgos residuales

| Verificación | Resultado y fecha | Evidencia |
| --- | --- | --- |
| HTTPS, redirección HTTP, cookies, headers y SecurityHeaders | Pendiente | Pendiente |
| SSL Labs | Pendiente | Pendiente |
| `npm audit`, lockfile y automatización de actualizaciones | Pendiente | Pendiente |
| OWASP ZAP baseline contra la URL propia | Pendiente | Pendiente |
| IDOR, inyección, XSS y bloqueo por intentos | Pendiente | Pendiente |
| Funcionamiento e invalidación de recuperación y sesión | Pendiente | Pendiente |
| Integración de CI y despliegue, reinicio y `/health` | Pendiente | Pendiente |
| Protección y restauración de datos y llaves | Pendiente | Pendiente |

Riesgos por evaluar: límites o suspensión del plan, filtración de secretos,
fallo del proveedor de correo o canal de recuperación, pérdida de llaves,
exceso de permisos y cobertura limitada de las herramientas automáticas. Los
escaneos son evidencias de un momento, no prueba de seguridad absoluta.
