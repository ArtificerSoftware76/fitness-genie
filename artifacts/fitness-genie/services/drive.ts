import { Linking, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
export { getVideoThumbnailUri, getVideoUri } from './workoutHtml';

type VideoAsset = { uri: string; name?: string | null; mimeType?: string | null; file?: Blob };
type DriveUpload = { id: string; name: string; webViewLink: string; thumbnailLink?: string };
type UploadError = { message?: string };

function apiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return path;
  return `https://${domain}${path}`;
}

export async function playVideo(videoUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(videoUri);
  } else {
    await WebBrowser.openBrowserAsync(videoUri);
  }
}

function parseUploadResponse(responseBody: string, status: number): DriveUpload {
  let body: DriveUpload | UploadError | null = null;
  try {
    body = JSON.parse(responseBody) as DriveUpload | UploadError;
  } catch {
    body = null;
  }

  if (status < 200 || status >= 300) {
    const message = body && 'message' in body ? body.message : undefined;
    throw new Error(message || `Video upload failed (${status}). Please try again.`);
  }
  if (!body || !('id' in body) || !('webViewLink' in body)) {
    throw new Error('Google Drive returned an incomplete upload response. Please try again.');
  }
  return body;
}

async function uploadVideoAsset(exerciseName: string, asset: VideoAsset): Promise<DriveUpload> {
  const url = apiUrl('/api/drive/upload');
  const mimeType = asset.mimeType || 'video/mp4';

  if (Platform.OS !== 'web') {
    const result = await FileSystem.uploadAsync(url, asset.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      parameters: { exerciseName },
      headers: { Accept: 'application/json' },
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    });
    return parseUploadResponse(result.body, result.status);
  }

  const form = new FormData();
  if (!asset.file) throw new Error('The selected video could not be read. Please choose it again.');
  form.append('file', asset.file, asset.name || 'exercise-video.mp4');
  form.append('exerciseName', exerciseName);
  const response = await fetch(url, { method: 'POST', body: form, headers: { Accept: 'application/json' } });
  return parseUploadResponse(await response.text(), response.status);
}

export async function pickAndUploadVideo(exerciseName: string): Promise<DriveUpload | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true, multiple: false });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  return uploadVideoAsset(exerciseName, asset);
}

export async function recordAndUploadVideo(exerciseName: string): Promise<DriveUpload | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera access is needed to record an exercise video.');
  const captured = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 600, quality: 0.7 });
  if (captured.canceled || !captured.assets[0]) return null;
  const asset = captured.assets[0];
  return uploadVideoAsset(exerciseName, { uri: asset.uri, name: asset.fileName, mimeType: asset.mimeType, file: asset.file });
}