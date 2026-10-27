import { AI_BASE_URL, AI_KEY, AI_MODEL } from '../app-info';

const read = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
/** Free AI settings: built in by the GitHub workflow, or set on one device with localStorage (vp.aiKey / vp.aiBase / vp.aiModel) for testing. */
export const aiKey = () => read('vp.aiKey') || AI_KEY;
export const aiBase = () => (read('vp.aiBase') || AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, '');
export const aiModel = () => read('vp.aiModel') || AI_MODEL || 'gemini-3.1-flash-lite';
export const freeAiConfigured = () => !!aiKey();
