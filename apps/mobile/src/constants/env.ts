export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';
export const CHAT_HUB_URL = `${API_BASE_URL.replace(/\/+$/, '')}/hubs/chat`;
