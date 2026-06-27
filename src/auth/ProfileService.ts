// ════════════════════════════════════════════════
// STUDIO P — ProfileService (auth/ProfileService.ts)
//
// Responsibilities:
//  - Profile validation
//  - Profile merging (OAuth + user-filled fields)
//  - Tier computation
//  - Avatar fallback generation
// ════════════════════════════════════════════════

import type { UserProfile, UserRole } from '@/types';
import { logger } from '@/core/logger';

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProfileService {
  private static instance: ProfileService;

  static getInstance(): ProfileService {
    if (!ProfileService.instance) ProfileService.instance = new ProfileService();
    return ProfileService.instance;
  }

  // ── Validate ─────────────────────────────────
  validate(profile: Partial<UserProfile>): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!profile.name || profile.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    if (!profile.email || !this.isValidEmail(profile.email)) {
      errors.push('A valid email address is required');
    }
    if (profile.phone && !this.isValidPhone(profile.phone)) {
      warnings.push('Phone number format looks unusual');
    }
    if (!profile.role) {
      errors.push('User role is required');
    }

    const result = { valid: errors.length === 0, errors, warnings };
    if (!result.valid) {
      logger.warn('ProfileService', 'Profile validation failed', { errors });
    } else {
      logger.debug('ProfileService', 'Profile validated', { email: profile.email });
    }
    return result;
  }

  // ── Merge OAuth data with user input ──────────
  merge(base: Partial<UserProfile>, overrides: Partial<UserProfile>): Partial<UserProfile> {
    const merged = {
      ...base,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => v !== undefined && v !== '')
      ),
      updatedAt: Date.now(),
    };
    logger.debug('ProfileService', 'Profiles merged', { keys: Object.keys(overrides) });
    return merged;
  }

  // ── Compute member tier ───────────────────────
  computeTier(visitCount: number): UserProfile['memberTier'] {
    if (visitCount >= 50) return 'platinum';
    if (visitCount >= 20) return 'gold';
    if (visitCount >= 5)  return 'silver';
    return 'bronze';
  }

  // ── Avatar fallback (initials → data URL) ─────
  getAvatarUrl(profile: Partial<UserProfile>): string {
    if (profile.avatar) return profile.avatar;
    return this.generateInitialsAvatar(profile.name ?? 'SP');
  }

  generateInitialsAvatar(name: string): string {
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');

    const canvas = document.createElement('canvas');
    canvas.width = 80; canvas.height = 80;
    const ctx = canvas.getContext('2d'); // Removed non-null assertion
    if (!ctx) {
      logger.error('ProfileService', 'Failed to get 2D rendering context for canvas.');
      return ''; // Or throw an error, depending on desired fallback behavior
    }
    ctx.fillStyle = '#B8966A';
    ctx.fillRect(0, 0, 80, 80);
    ctx.fillStyle = '#070604';
    ctx.font = 'bold 32px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 40, 42);
    return canvas.toDataURL();
  }

  // ── Role display labels ───────────────────────
  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      admin:  'Studio Admin',
      editor: 'Studio Editor',
      viewer: 'Member',
      guest:  'Guest',
    };
    return labels[role] ?? 'Member';
  }

  // ── Private utils ─────────────────────────────
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    return /^\+?[\d\s\-().]{7,20}$/.test(phone);
  }
}

export const profileService = ProfileService.getInstance();