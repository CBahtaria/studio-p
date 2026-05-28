// ════════════════════════════════════════════════
// STUDIO P — OS Detection (core/osDetect.ts)
// Detects runtime environment for adaptive UI
// ════════════════════════════════════════════════

import type { OSInfo, OS } from '@/types';

const CHROME_HEIGHTS: Record<OS, number> = {
  macos: 28, windows: 40, linux: 44, ios: 44, android: 48, generic: 52,
};

export function detectOS(): OSInfo {
  const ua = navigator.userAgent;
  const pt = (navigator.platform || '').toLowerCase();
  const touch = navigator.maxTouchPoints || 0;

  let os: OS = 'generic';
  let label = 'Browser';
  let icon = '🌐';
  let mobile = false;

  if (/iphone|ipad|ipod/i.test(ua) || (pt.includes('mac') && touch > 1)) {
    os = 'ios'; label = 'iOS'; icon = ''; mobile = true;
  } else if (/android/i.test(ua)) {
    os = 'android'; label = 'Android'; icon = '🤖'; mobile = true;
  } else if (/macintosh|mac os x/i.test(ua) && touch === 0) {
    os = 'macos'; label = 'macOS'; icon = '';
  } else if (/win(dows|32|64|ce)/i.test(ua) || pt.includes('win')) {
    os = 'windows'; label = 'Windows'; icon = '🪟';
  } else if (/linux/i.test(ua) || pt.includes('linux')) {
    os = 'linux'; label = 'Linux'; icon = '🐧';
  }

  return { os, label, icon, mobile, chromeHeight: CHROME_HEIGHTS[os] };
}

export const osInfo: OSInfo = detectOS();
