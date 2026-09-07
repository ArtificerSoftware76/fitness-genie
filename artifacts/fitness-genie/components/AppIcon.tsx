import React, { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export type AppIconName =
  | 'activity' | 'alert-circle' | 'check' | 'check-circle' | 'circle'
  | 'clipboard' | 'cloud' | 'download' | 'image' | 'mail' | 'play'
  | 'plus' | 'plus-circle' | 'refresh-cw' | 'rotate-ccw' | 'search'
  | 'settings' | 'share-2' | 'trash-2' | 'upload' | 'user-plus'
  | 'users' | 'video' | 'x';

export function AppIcon({ name, size = 20, color, strokeWidth = 2 }: { name: AppIconName; size?: number; color: ColorValue; strokeWidth?: number }) {
  let content: ReactNode;

  switch (name) {
    case 'plus':
      content = <><Line x1="12" y1="5" x2="12" y2="19" /><Line x1="5" y1="12" x2="19" y2="12" /></>;
      break;
    case 'x':
      content = <><Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" /></>;
      break;
    case 'check':
      content = <Polyline points="20 6 9 17 4 12" />;
      break;
    case 'search':
      content = <><Circle cx="11" cy="11" r="7" /><Line x1="16.65" y1="16.65" x2="21" y2="21" /></>;
      break;
    case 'circle':
      content = <Circle cx="12" cy="12" r="9" />;
      break;
    case 'check-circle':
      content = <><Path d="M21 11.1V12a9 9 0 1 1-5.3-8.2" /><Polyline points="21 4 12 13 9 10" /></>;
      break;
    case 'plus-circle':
      content = <><Circle cx="12" cy="12" r="9" /><Line x1="12" y1="8" x2="12" y2="16" /><Line x1="8" y1="12" x2="16" y2="12" /></>;
      break;
    case 'users':
      content = <><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>;
      break;
    case 'user-plus':
      content = <><Path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx="8" cy="7" r="4" /><Line x1="19" y1="8" x2="19" y2="14" /><Line x1="16" y1="11" x2="22" y2="11" /></>;
      break;
    case 'activity':
      content = <Polyline points="3 12 8 12 11 4 15 20 18 12 21 12" />;
      break;
    case 'clipboard':
      content = <><Path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><Rect x="9" y="2" width="6" height="5" rx="1" /></>;
      break;
    case 'settings':
      content = <><Circle cx="12" cy="12" r="3" /><Path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></>;
      break;
    case 'image':
      content = <><Rect x="3" y="3" width="18" height="18" rx="2" /><Circle cx="8.5" cy="8.5" r="1.5" /><Polyline points="21 15 16 10 5 21" /></>;
      break;
    case 'play':
      content = <Polygon points="7 4 20 12 7 20 7 4" fill={color} stroke={color} />;
      break;
    case 'video':
      content = <><Rect x="2" y="5" width="14" height="14" rx="2" /><Polygon points="16 9 22 6 22 18 16 15" /></>;
      break;
    case 'cloud':
      content = <Path d="M17.5 19H7a5 5 0 0 1-.8-9.94A7 7 0 0 1 19.7 11 4 4 0 0 1 17.5 19Z" />;
      break;
    case 'refresh-cw':
      content = <><Polyline points="23 4 23 10 17 10" /><Polyline points="1 20 1 14 7 14" /><Path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" /></>;
      break;
    case 'rotate-ccw':
      content = <><Polyline points="1 4 1 10 7 10" /><Path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></>;
      break;
    case 'upload':
      content = <><Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline points="17 8 12 3 7 8" /><Line x1="12" y1="3" x2="12" y2="15" /></>;
      break;
    case 'download':
      content = <><Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline points="7 10 12 15 17 10" /><Line x1="12" y1="15" x2="12" y2="3" /></>;
      break;
    case 'mail':
      content = <><Rect x="3" y="5" width="18" height="14" rx="2" /><Polyline points="3 7 12 13 21 7" /></>;
      break;
    case 'share-2':
      content = <><Circle cx="18" cy="5" r="3" /><Circle cx="6" cy="12" r="3" /><Circle cx="18" cy="19" r="3" /><Line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><Line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /></>;
      break;
    case 'trash-2':
      content = <><Polyline points="3 6 5 6 21 6" /><Path d="M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></>;
      break;
    case 'alert-circle':
      content = <><Circle cx="12" cy="12" r="9" /><Line x1="12" y1="8" x2="12" y2="13" /><Circle cx="12" cy="17" r=".5" fill={color} /></>;
      break;
  }

  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{content}</Svg>;
}