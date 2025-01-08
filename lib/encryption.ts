import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export async function encrypt(text: string, password: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  // Create key from password using SHA-256
  const key = Buffer.from(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  ));
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

export async function decrypt(encryptedText: string, password: string): Promise<string> {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  // Create key from password using SHA-256
  const key = Buffer.from(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  ));

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}