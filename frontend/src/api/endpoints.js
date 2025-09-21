import { API_BASE, httpGet, httpPost, wsUrl } from "./client";

export const urls = {
  panic: `${API_BASE}/panic`,
  anomaly: `${API_BASE}/anomaly`,
  escalate: `${API_BASE}/escalate`,
  explanation: (reason) => `${API_BASE}/explanation?reason=${encodeURIComponent(reason)}`,
  guidance: (location, risk) => `${API_BASE}/guidance?location=${encodeURIComponent(location)}&risk=${encodeURIComponent(risk)}`,
  websocket: wsUrl,
};

export const api = {
  sendPanic: (payload) => httpPost(urls.panic, payload),
  sendAnomaly: (payload) => httpPost(urls.anomaly, payload),
  sendEscalation: (payload) => httpPost(urls.escalate, payload),
  getExplanation: (reason) => httpGet(urls.explanation(reason)),
  getGuidance: (location, risk) => httpGet(urls.guidance(location, risk)),
  wsUrl,
};
