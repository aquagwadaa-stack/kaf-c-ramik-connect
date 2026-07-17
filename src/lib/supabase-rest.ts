import { useEffect, useMemo, useState } from "react";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  prefer?: string;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
  };
};

const SESSION_KEY = "kafe-ceramik-admin-session";
const AUTH_EVENT = "kafe-ceramik-auth-change";

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey:
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
};

function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

function baseUrl() {
  if (!supabaseConfig.url) throw new Error("Supabase URL missing");
  return supabaseConfig.url.replace(/\/$/, "");
}

function anonKey() {
  if (!supabaseConfig.anonKey) throw new Error("Supabase anon key missing");
  return supabaseConfig.anonKey;
}

export function readAdminSession(): SupabaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SupabaseSession;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveAdminSession(session: SupabaseSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useAdminSession() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<SupabaseSession | null>(null);

  useEffect(() => {
    const update = () => setSession(readAdminSession());
    update();
    window.addEventListener(AUTH_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(AUTH_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return useMemo(
    () => ({
      configured,
      session,
      signedIn: Boolean(session?.access_token),
    }),
    [configured, session],
  );
}

export type AdminProfile = {
  email: string | null;
  role: "owner" | "manager" | "team" | "readonly";
};

export function useAdminAccess() {
  const auth = useAdminSession();
  const [checking, setChecking] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (!auth.configured || !auth.signedIn) {
      setChecking(false);
      setProfile(null);
      return;
    }

    let alive = true;
    setChecking(true);
    callRpc<AdminProfile[]>("get_current_kafe_admin", {}, true)
      .then((rows) => {
        if (!alive) return;
        setProfile(rows[0] ?? null);
      })
      .catch(() => {
        if (alive) setProfile(null);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
  }, [auth.configured, auth.session?.access_token, auth.signedIn]);

  return {
    ...auth,
    checking,
    allowed: !auth.configured || Boolean(profile),
    profile,
  };
}

export async function signInAdmin(email: string, password: string) {
  const response = await fetch(`${baseUrl()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = (await response.json()) as SupabaseSession & { expires_in?: number };
  const session: SupabaseSession = {
    ...data,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };
  saveAdminSession(session);
  return session;
}

export function signOutAdmin() {
  saveAdminSession(null);
}

async function errorMessage(response: Response) {
  try {
    const data = await response.json();
    return data.message ?? data.error_description ?? data.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");

  const session = readAdminSession();
  const token = options.auth ? session?.access_token : undefined;
  if (options.auth && !token) throw new Error("Admin session required");

  const key = anonKey();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...(options.prefer ? { Prefer: options.prefer } : {}),
  };
  // New-format publishable keys are opaque, not JWTs. PostgREST rejects
  // them when sent as a Bearer token, so only attach Authorization when
  // we have a real user access token from signInAdmin.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (!isOpaqueKey(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) throw new Error(await errorMessage(response));
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function selectRows<T>(table: string, query = "", auth = false) {
  return request<T[]>(`/rest/v1/${table}${query}`, { auth });
}

export async function upsertRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  auth = true,
) {
  return request<T[]>(`/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    body: rows,
    auth,
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  row: T,
  auth = false,
) {
  return request<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    body: row,
    auth,
    prefer: auth ? "return=representation" : "return=minimal",
  });
}

export async function patchRow<T extends Record<string, unknown>>(
  table: string,
  id: string,
  patch: T,
  auth = true,
) {
  return request<T[]>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
    auth,
    prefer: "return=representation",
  });
}

export async function patchRowsByColumn<T extends Record<string, unknown>>(
  table: string,
  column: string,
  value: string,
  patch: T,
  auth = true,
) {
  return request<T[]>(
    `/rest/v1/${table}?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`,
    {
      method: "PATCH",
      body: patch,
      auth,
      prefer: "return=representation",
    },
  );
}

export async function deleteRow(table: string, id: string, auth = true) {
  return request<void>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth,
    prefer: "return=minimal",
  });
}

export async function deleteRowsByColumn(
  table: string,
  column: string,
  value: string,
  auth = true,
) {
  return request<void>(
    `/rest/v1/${table}?${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`,
    {
      method: "DELETE",
      auth,
      prefer: "return=minimal",
    },
  );
}

export async function callRpc<T>(name: string, args: Record<string, unknown>, auth = false) {
  return request<T>(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: args,
    auth,
  });
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  auth = false,
) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const session = readAdminSession();
  if (auth && !session?.access_token) throw new Error("Admin session required");

  const headers: Record<string, string> = {
    apikey: anonKey(),
    "Content-Type": "application/json",
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(`${baseUrl()}/functions/v1/${encodeURIComponent(name)}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as T;
}

export async function uploadAdminFile(bucket: string, path: string, file: Blob) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const session = readAdminSession();
  if (!session?.access_token) throw new Error("Admin session required");

  const response = await fetch(
    `${baseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: anonKey(),
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: file,
    },
  );
  if (!response.ok) throw new Error(await errorMessage(response));

  return `${baseUrl()}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
