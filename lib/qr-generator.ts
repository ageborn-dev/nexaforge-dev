import QRCode from 'qrcode';

export async function generateQRCode(url: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000',
        light: '#fff'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return '';
  }
}