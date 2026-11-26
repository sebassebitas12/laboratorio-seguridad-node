const { randomBytes, createCipheriv, createDecipheriv, createHash } = require('node:crypto');

function encrypt(key, text, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
}

function decrypt(key, value, context) {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('Datos cifrados inválidos');
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64'));
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Datos cifrados inválidos');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }

module.exports = { encrypt, decrypt, tokenHash };
