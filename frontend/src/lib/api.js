import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("arsa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErr(detail) {
  if (detail == null) return "Terjadi kesalahan. Coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && e.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && detail.msg) return detail.msg;
  return String(detail);
}

// Cross-origin-safe download: fetch as blob through backend proxy, then save.
export async function downloadPhoto(photo) {
  const res = await api.get(`/photos/${photo.id}/download`, { responseType: "blob" });
  let filename = photo.download_name || "photo.jpg";
  const cd = res.headers["content-disposition"];
  if (cd) {
    const m = cd.match(/filename="?([^"]+)"?/);
    if (m) filename = m[1];
  }
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

export const fileUrl = (photo) => `${API}${photo.file_url.replace("/api", "")}`;

export function isDarkColor(hex) {
  if (!hex || typeof hex !== "string") return true;
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.55;
}

export default api;
