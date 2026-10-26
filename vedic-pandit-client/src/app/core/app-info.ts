/**
 * Where the website and the Android app live.
 * The GitHub workflows fill these in from the repository they run in
 * (see .github/workflows/android.yml), so you normally never edit this file.
 */
export const GITHUB_REPO = 'ekantshukla/VedicPandit';
export const APP_VERSION = '1.0.0';

/**
 * Address of the hosted .NET API (PanditJi's full answers), e.g. 'https://vedic-pandit-api.onrender.com'.
 * Empty = the API is on the same address as the site (Angular served by the .NET app), or there is none
 * and the site runs in demo mode. The GitHub workflows fill this in from the repository variable API_URL.
 */
export const API_URL: string = '';

const [owner, repo] = GITHUB_REPO.split('/');
/** The live website (GitHub Pages). */
export const WEBSITE_URL = `https://${owner.toLowerCase()}.github.io/${repo}/`;
/** Always the newest Android app. */
export const APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/VedicPandit.apk`;

/** Dakshina (donations) via UPI. */
export const UPI_ID = 'shuklaekant@okhdfcbank';
export const UPI_NAME = 'Ekant Shukla';
