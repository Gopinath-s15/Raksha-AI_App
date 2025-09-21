// Centralized API client for Raksha AI frontend
// Configure base URL via env: REACT_APP_API_BASE

export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export const wsUrl = () => `${API_BASE.replace("http", "ws")}/ws`;

export async function httpGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export async function httpPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}
