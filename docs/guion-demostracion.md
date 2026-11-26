# Guion de demostración

**Borrador pendiente de ejecutar.** El enunciado solicita una demostración en
vivo de diez minutos o un video, con al menos tres ataques bloqueados. Usar
únicamente la aplicación y cuentas de prueba propias, con datos sintéticos.
No mostrar contraseñas, tokens, llaves ni cadenas de conexión. El acceso de
docencia se entrega por canal privado, nunca en el repositorio.

| Tiempo orientativo | Qué mostrar | Comprobación que debe registrarse |
| --- | --- | --- |
| 0:00–1:00 | Alcance, arquitectura y URL HTTPS | Certificado, estado de la app y explicación del flujo |
| 1:00–3:00 | Registro, ingreso, notas y perfil | Alta, lectura, modificación y borrado de notas propias; perfil enmascarado |
| 3:00–4:00 | Datos protegidos en almacenamiento | Evidencia segura de hash de contraseña y nota cifrada, sin exponer secretos |
| 4:00–5:00 | Control de acceso: IDOR | La cuenta A intenta operar sobre una nota de B y recibe denegación |
| 5:00–6:00 | Inyección o XSS | Una entrada de prueba controlada se rechaza o no ejecuta código |
| 6:00–7:00 | Intentos repetidos de ingreso | El límite devuelve 429 y el evento correspondiente queda registrado |
| 7:00–8:00 | Rol administrador y bitácora | Una cuenta normal no entra; la administradora consulta eventos |
| 8:00–9:00 | Automatización y controles de despliegue | CI, secretos por nombre, conexiones y resultados de verificaciones reales |
| 9:00–10:00 | Riesgos residuales y recuperación | Rotación/pérdida de llave y próximos pasos sin prometer seguridad absoluta |

Antes de grabar: crear dos usuarios y una persona administradora según el
procedimiento seguro disponible; ejecutar y documentar las pruebas, confirmar
que la aplicación está activa durante la evaluación y revisar que la evidencia
no incluya datos sensibles. Las pruebas de ataque solo están permitidas contra
la aplicación propia o con autorización expresa.
