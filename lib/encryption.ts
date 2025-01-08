const ALGORITHM = 'AES-CBC';
const IV_LENGTH = 16;

export async function encrypt(text: string, password: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  );
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: ALGORITHM },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    cryptoKey,
    new TextEncoder().encode(text)
  );

  // Convert to hex strings
  const encryptedHex = Array.from(new Uint8Array(encrypted))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${encryptedHex}`;
}

export async function decrypt(encryptedText: string, password: string): Promise<string> {
  const [ivHex, encrypted] = encryptedText.split(':');
  
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encryptedBytes = new Uint8Array(encrypted.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  
  const key = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  );

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: ALGORITHM },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    cryptoKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decrypted);
}