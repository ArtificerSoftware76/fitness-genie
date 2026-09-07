import type { Client, Exercise, Workout } from '../data/types';

export type ImageDataUrlResolver = (uri?: string) => Promise<string>;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);

const defaultImageDataUrl: ImageDataUrlResolver = async (uri) => uri?.startsWith('data:image/') ? uri : '';

function apiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return path;
  return `https://${domain}${path}`;
}

export function getVideoThumbnailUri(fileId?: string, thumbnailUri?: string, size?: number): string | undefined {
  if (fileId) {
    const hasRequestedSize = typeof size === 'number' && Number.isInteger(size) && size > 0;
    const sizeQuery = hasRequestedSize ? `&size=${size}` : '';
    return apiUrl(`/api/drive/thumbnail/${encodeURIComponent(fileId)}?v=${hasRequestedSize ? 3 : 2}${sizeQuery}`);
  }
  return thumbnailUri || undefined;
}

export function getVideoUri(fileId?: string, videoUri?: string): string | undefined {
  if (videoUri) return videoUri;
  if (fileId) return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
  return undefined;
}

export async function renderWorkoutHtml(
  workout: Workout,
  client: Client,
  exercises: Exercise[],
  logo = '',
  resolveImageDataUrl: ImageDataUrlResolver = defaultImageDataUrl,
): Promise<string> {
  const rows = (await Promise.all(workout.items.map(async (item, index) => {
    const exercise = exercises.find((entry) => entry.id === item.exerciseId);
    if (!exercise) return '';
    const videoUri = getVideoUri(exercise.videoFileId, exercise.videoUri);
    const thumbnailUri = getVideoThumbnailUri(exercise.videoFileId, exercise.videoThumbnailUri) || exercise.photoUri || undefined;
    const thumbnail = await resolveImageDataUrl(thumbnailUri);
    const prescription = [
      ['Resistance', item.resistance],
      ['Repetitions', item.reps],
      ['Sets', item.sets],
      ['Duration', item.duration],
      ['Type', item.type],
      ['Rest', item.rest],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())).map(([label, value]) => `<span class="prescription-item"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`).join('');
    const details = [
      ['Difficulty Level', exercise.difficultyLevel],
      ['Joint / Muscle Group Involved', exercise.jointMuscleGroup],
      ['Intensity', exercise.intensity],
      ['Need / Purpose', exercise.needPurpose],
      ['Notes / Cues', exercise.notesCues],
      ['Contraindications', exercise.contraindications],
      ['Modifications / Related Exercises', exercise.modifications],
      ['Client-specific Notes', item.notes],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())).map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('');
    const preview = videoUri
      ? `<a class="video-link" href="${escapeHtml(videoUri)}">${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(exercise.name)} video preview" />` : '<span class="video-placeholder"><span class="play-icon">▶</span><span>PLAY VIDEO</span></span>'}<span class="play-badge">▶</span></a>`
      : thumbnail
        ? `<span class="image-preview"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(exercise.name)} preview" /></span>`
        : '';
    return `<section class="exercise"><div class="number">${index + 1}</div><div class="exercise-content">${preview}<h2>${escapeHtml(exercise.name)}</h2>${prescription ? `<div class="prescription">${prescription}</div>` : ''}<div class="details">${details}</div><div class="clear"></div></div></section>`;
  }))).join('');
  const logoMarkup = logo ? `<img src="${escapeHtml(logo)}" alt="Fitness Genie logo" class="logo" />` : '<div class="brand">FITNESS GENIE</div>';
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{margin:30px}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211f;margin:0}.top{background:#17211f;color:#fff;padding:28px;border-radius:18px}.brand{font-size:12px;letter-spacing:2px;color:#f4c7a8;font-weight:700}.logo{display:block;max-width:180px;max-height:54px;object-fit:contain;object-position:left center;margin-bottom:10px}.top h1{font-size:30px;margin:8px 0}.top p{margin:5px 0;color:#e9f0ea}.meta{display:flex;gap:12px;margin:20px 0}.pill{background:#f8f6f1;border:1px solid #dddcd3;padding:9px 13px;border-radius:999px;font-size:13px}.exercise{display:grid;grid-template-columns:36px 1fr;gap:14px;border-bottom:1px solid #dddcd3;padding:20px 2px;page-break-inside:avoid}.number{background:#e76f51;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}.exercise-content{min-width:0}.exercise h2{font-size:19px;margin:2px 0 10px}.exercise p{font-size:12px;line-height:1.45;margin:7px 0}.prescription{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.prescription-item{display:inline-flex;flex-direction:column;background:#e9f0ea;color:#21473b;border-radius:8px;padding:5px 8px;min-width:62px}.prescription-item small{font-size:8px;line-height:1.2;letter-spacing:.45px;text-transform:uppercase;color:#68736f}.prescription-item b{font-size:11px;line-height:1.25;margin-top:2px}.video-link,.image-preview{position:relative;float:left;display:block;width:132px;height:132px;margin:0 15px 8px 0;border-radius:14px;overflow:hidden;background:#e9f0ea;border:1px solid #d8ddd8;text-decoration:none}.video-link img,.image-preview img{width:100%;height:100%;object-fit:cover;display:block}.video-placeholder{display:flex;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#21473b;font-size:9px;letter-spacing:.7px;font-weight:800}.play-icon{font-size:25px;color:#e76f51}.play-badge{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:#e76f51;color:white;border:3px solid rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font-size:15px;padding-left:2px;box-shadow:0 2px 8px rgba(0,0,0,.2)}.details strong{color:#21473b}.clear{clear:both}.footer{margin-top:24px;color:#68736f;font-size:11px;text-align:center}</style></head><body><header class="top">${logoMarkup}<h1>${escapeHtml(workout.title)}</h1><p>Prepared for ${escapeHtml(client.name)}</p>${workout.description ? `<p>${escapeHtml(workout.description)}</p>` : ''}</header><div class="meta"><div class="pill">${escapeHtml(workout.date)}</div><div class="pill">${workout.items.length} exercises</div></div>${rows}<div class="footer">Move with control. Stop if you feel pain and contact your coach with questions.</div></body></html>`;
}