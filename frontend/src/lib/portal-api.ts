import axios from "axios";

export const portalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor — adjunta el JWT de portal desde sessionStorage.
// NUNCA lee localStorage.accessToken (staff) ni redirige a /login.
portalApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = sessionStorage.getItem("portalToken");
    if (t) {
      config.headers.Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

export function setPortalToken(token: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("portalToken", token);
  }
}

export function clearPortalToken(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("portalToken");
  }
}
