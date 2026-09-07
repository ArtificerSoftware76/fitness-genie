import type { Client } from '@/data/types';

export type PhotoPickerResult = {
  canceled: boolean;
  assets?: Array<{ uri?: string | null }> | null;
};

export type ClientPhotoPicker = {
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain?: boolean }>;
  launchImageLibraryAsync: (options: {
    mediaTypes: ['images'];
    allowsEditing: true;
    aspect: [number, number];
    quality: number;
  }) => Promise<PhotoPickerResult>;
};

export type ClientPhotoSelection =
  | { status: 'selected'; uri: string }
  | { status: 'cancelled' | 'denied' | 'settings-required' };

export type PhotoSettingsResult = 'opened' | 'unavailable' | 'failed';

export async function selectClientPhoto(picker: ClientPhotoPicker): Promise<ClientPhotoSelection> {
  const permission = await picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain === false ? 'settings-required' : 'denied' };
  }

  const result = await picker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  const uri = result.assets?.[0]?.uri;
  if (result.canceled || !uri) return { status: 'cancelled' };
  return { status: 'selected', uri };
}

export async function openClientPhotoSettings(
  platform: string,
  openSettings: () => Promise<void>,
): Promise<PhotoSettingsResult> {
  if (platform === 'web') return 'unavailable';

  try {
    await openSettings();
    return 'opened';
  } catch {
    return 'failed';
  }
}

export function normalizeClientPhotoUri(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function getClientAvatarUri(client: Pick<Client, 'photoUri'>): string | undefined {
  return client.photoUri || undefined;
}