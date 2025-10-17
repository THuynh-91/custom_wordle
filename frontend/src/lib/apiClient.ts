export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(path: string): string {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (!API_BASE_URL) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(buildUrl(input), init);
}
