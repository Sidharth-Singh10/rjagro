import type { User } from '../types/auth';

/**
 * Dev-only auth bypass, used to open the dashboard without a running backend
 * or a real JWT. Enable it per machine with the gitignored
 * `rjagro_frontend/.env.local`:
 *
 *   NEXT_PUBLIC_AUTH_BYPASS=true
 *
 * The flag is ignored in production builds, and it only short-circuits the
 * client-side guard — API calls still go to NEXT_PUBLIC_API_URL and fail on
 * their own if there is no backend. Modules backed by static data, such as
 * Analytics, work fully offline.
 */
export const isDevAuthBypass = (): boolean =>
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

export const DEV_USER: User = {
    user_id: 0,
    name: 'Dev Admin',
    email: 'dev@rjagro.local',
    password: '',
    role: 'Admin',
    created_at: '',
};

/** Token-shaped stub so any cookie/expiry-aware code downstream stays happy. */
export const devToken = (): string => {
    const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7 * 86400 });
    return `dev.${btoa(payload)}.mock`;
};
