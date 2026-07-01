   1 | // ════════════════════════════════════════════════
   2 | // STUDIO P — ProfileService (auth/ProfileService.ts)
   3 | //
   4 | // Responsibilities:
   5 | //  - Profile validation
   6 | //  - Profile merging (OAuth + user-filled fields)
   7 | //  - Tier computation
   8 | //  - Avatar fallback generation
   9 | // ════════════════════════════════════════════════
  10 | 
  11 | import type { UserProfile, UserRole } from "@/types";
  12 | import { logger } from "@/core/logger";
  13 | 
  14 | export interface ProfileValidationResult {
  15 |   valid: boolean;
  16 |   errors: string[];
  17 |   warnings: string[];
  18 | }
  19 | 
  20 | export class ProfileService {
  21 |   private static instance: ProfileService;
  22 | 
  23 |   static getInstance(): ProfileService {
  24 |     if (!ProfileService.instance) ProfileService.instance = new ProfileService();
  25 |     return ProfileService.instance;
  26 |   }
  27 | 
  28 |   // ── Validate ─────────────────────────────────
  29 |   validate(profile: Partial<UserProfile>): ProfileValidationResult {
  30 |     const errors: string[] = [];
  31 |     const warnings: string[] = [];
  32 | 
  33 |     if (!profile.name || profile.name.trim().length < 2) {
  34 |       errors.push("Name must be at least 2 characters");
  35 |     }
  36 |     if (profile.email === undefined || profile.email === null || !this.isValidEmail(profile.email)) {
  37 |       errors.push("A valid email address is required");
  38 |     }
  39 |     if (profile.phone && !this.isValidPhone(profile.phone)) {
  40 |       warnings.push("Phone number format looks unusual");
  41 |     }
  42 |     if (!profile.role) {
  43 |       errors.push("User role is required");
  44 |     }
  45 | 
  46 |     const result = { valid: errors.length === 0, errors, warnings };
  47 |     if (!result.valid) {
  48 |       logger.warn("ProfileService", "Profile validation failed", { errors });
  49 |     } else {
  50 |       logger.debug("ProfileService", "Profile validated", { email: profile.email });
  51 |     }
  52 |     return result;
  53 |   }
  54 | 
  55 |   // ── Merge OAuth data with user input ──────────
  56 |   merge(base: Partial<UserProfile>, overrides: Partial<UserProfile>): Partial<UserProfile> {
  57 |     const merged = {
  58 |       ...base,
  59 |       ...Object.fromEntries(
  60 |         Object.entries(overrides).filter(([, v]) => v !== undefined && v !== "")
  61 |       ),
  62 |       updatedAt: Date.now(),
  63 |     };
  64 |     logger.debug("ProfileService", "Profiles merged", { keys: Object.keys(overrides) });
  65 |     return merged;
  66 |   }
  67 | 
  68 |   // ── Compute member tier ───────────────────────
  69 |   computeTier(visitCount: number): UserProfile["memberTier"] {
  70 |     if (visitCount >= 50) return "platinum";
  71 |     if (visitCount >= 20) return "gold";
  72 |     if (visitCount >= 5)  return "silver";
  73 |     return "bronze";
  74 |   }
  75 | 
  76 |   // ── Avatar fallback (initials → data URL) ─────
  77 |   getAvatarUrl(profile: Partial<UserProfile>): string {
  78 |     if (profile.avatar) return profile.avatar;
  79 |     return this.generateInitialsAvatar(profile.name ?? "SP");
  80 |   }
  81 | 
  82 |   generateInitialsAvatar(name: string): string {
  83 |     const initials = name
  84 |       .split(" ")
  85 |       .slice(0, 2)
  86 |       .map(n => n[0]?.toUpperCase() ?? "")
  87 |       .join("");
  88 | 
  89 |     const canvas = document.createElement("canvas");
  90 |     canvas.width = 80; canvas.height = 80;
  91 |     const ctx = canvas.getContext("2d");
  92 |     if (!ctx) {
  93 |       logger.error("ProfileService", "Failed to get 2D rendering context for canvas");
  94 |       return "";
  95 |     }
  96 |     ctx.fillStyle = "#B8966A";
  97 |     ctx.fillRect(0, 0, 80, 80);
  98 |     ctx.fillStyle = "#070604";
  99 |     ctx.font = "bold 32px \"Cormorant Garamond\", serif";
 100 |     ctx.textAlign = "center";
 101 |     ctx.textBaseline = "middle";
 102 |     ctx.fillText(initials, 40, 42);
 103 |     return canvas.toDataURL();
 104 |   }
 105 | 
 106 |   // ── Role display labels ───────────────────────
 107 |   getRoleLabel(role: UserRole): string {
 108 |     const labels: Record<UserRole, string> = {
 109 |       admin:  "Studio Admin",
 110 |       editor: "Studio Editor",
 111 |       viewer: "Member",
 112 |       guest:  "Guest",
 113 |     };
 114 |     return labels[role] ?? "Member";
 115 |   }
 116 | 
  117 |   // ── Private utils ─────────────────────────────
 118 |   private isValidEmail(email: string): boolean {
 119 |     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 120 |   }
 121 | 
 122 |   private isValidPhone(phone: string): boolean {
 123 |     return /^\+?[\d\s\-().]{7,20}$/.test(phone);
 124 |   }
 125 | }
 126 | 
 127 | export const profileService = ProfileService.getInstance();
 128 | 