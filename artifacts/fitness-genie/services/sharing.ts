import { Image as NativeImage, Linking, Platform } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Client, Exercise, Workout } from '@/data/types';
import { fitnessGenieLogo } from '@/assets/branding';
import { renderWorkoutHtml } from '@/services/workoutHtml';
import { createNamedWorkoutPdf, emailNamedWorkoutPdf, PdfSharingRuntime, shareNamedWorkoutPdf } from '@/services/sharingCore';

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += base64Alphabet[(triplet >> 18) & 63];
    result += base64Alphabet[(triplet >> 12) & 63];
    result += second === undefined ? '=' : base64Alphabet[(triplet >> 6) & 63];
    result += third === undefined ? '=' : base64Alphabet[triplet & 63];
  }
  return result;
}

function imageMimeType(uri: string, header?: string | null): string {
  const contentType = header?.split(';')[0].trim().toLowerCase();
  if (contentType?.startsWith('image/')) return contentType;
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/png';
}

async function imageDataUrl(uri?: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:image/')) return uri;
  try {
    if (uri.startsWith('file:')) {
      return `data:${imageMimeType(uri)};base64,${await new File(uri).base64()}`;
    }
    const response = await fetch(uri);
    if (!response.ok) return '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${imageMimeType(uri, response.headers.get('content-type'))};base64,${bytesToBase64(bytes)}`;
  } catch {
    return '';
  }
}

async function logoDataUrl(uri?: string): Promise<string> {
  const resolvedUri = uri || NativeImage.resolveAssetSource(fitnessGenieLogo).uri;
  return imageDataUrl(resolvedUri);
}

function safeFilenamePart(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  return cleaned || fallback;
}

export function workoutPdfFilename(workout: Workout, client: Client): string {
  return `${safeFilenamePart(client.name, 'Client')}-${safeFilenamePart(workout.title, 'Workout')}.pdf`;
}

export async function workoutHtml(workout: Workout, client: Client, exercises: Exercise[], logo?: string): Promise<string> {
  return renderWorkoutHtml(workout, client, exercises, logo, imageDataUrl);
}

export async function createWorkoutPdf(workout: Workout, client: Client, exercises: Exercise[], pdfLogoUri?: string) {
  return createNamedWorkoutPdf(nativeRuntime, await workoutHtml(workout, client, exercises, await logoDataUrl(pdfLogoUri)), workoutPdfFilename(workout, client));
}

export async function emailWorkoutPdf(workout: Workout, client: Client, exercises: Exercise[], pdfLogoUri?: string) {
  const pdf = await createWorkoutPdf(workout, client, exercises, pdfLogoUri);
  return emailNamedWorkoutPdf(nativeRuntime, pdf, client.email, client.name, workout.title);
}

export async function shareWorkoutPdf(workout: Workout, client: Client, exercises: Exercise[], pdfLogoUri?: string) {
  const pdf = await createWorkoutPdf(workout, client, exercises, pdfLogoUri);
  return shareNamedWorkoutPdf(nativeRuntime, pdf);
}

const nativeRuntime: PdfSharingRuntime = {
  printToFileAsync: Print.printToFileAsync,
  createCacheFile: (filename) => nativePdfFile(new File(Paths.cache, filename)),
  createFile: (uri) => nativePdfFile(new File(uri)),
  isMailAvailableAsync: MailComposer.isAvailableAsync,
  composeAsync: async (options) => { await MailComposer.composeAsync(options); },
  isSharingAvailableAsync: Sharing.isAvailableAsync,
  shareAsync: Sharing.shareAsync,
  openURL: Linking.openURL,
  platform: Platform.OS,
};

function nativePdfFile(file: File) {
  return {
    uri: file.uri,
    get exists() { return file.exists; },
    delete: () => file.delete(),
    copy: (destination: { uri: string }) => file.copy(new File(destination.uri)),
  };
}