import { readFileSync } from "node:fs";

type Environment = Record<string, string | undefined>;

export type IsolatedE2EConfig = {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
};

const blocked = () => new Error("E2E bloqueado: falta confirmar una base de pruebas aislada.");

function parseBackendUrl(value: string | undefined): URL {
  if (!value) throw blocked();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw blocked();
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw blocked();
  }
  return url;
}

/** Offline preflight only. Confirmation is an operator attestation, not proof of isolation. */
export function validateIsolatedE2EConfig(
  env: Environment,
  linkedProjectId: string,
): IsolatedE2EConfig {
  if (!linkedProjectId || env["E2E_ISOLATED_DATABASE"] !== "true") throw blocked();
  const target = parseBackendUrl(env["E2E_SUPABASE_URL"]);
  const confirmed = parseBackendUrl(env["E2E_CONFIRMED_URL"]);
  if (target.origin !== confirmed.origin) throw blocked();

  // Never accept the checked-in Lovable project, even if the operator sets the flags.
  if (target.hostname.toLowerCase() === `${linkedProjectId.toLowerCase()}.supabase.co`) {
    throw new Error("E2E bloqueado: el destino es el proyecto vinculado a Lovable.");
  }

  // Also reject the application's configured backend, including custom domains.
  for (const name of ["SUPABASE_URL", "VITE_SUPABASE_URL"]) {
    if (env[name] && parseBackendUrl(env[name]).origin === target.origin) {
      throw new Error("E2E bloqueado: el destino coincide con el backend de la aplicación.");
    }
  }

  const publishableKey = env["E2E_SUPABASE_PUBLISHABLE_KEY"]?.trim();
  const serviceRoleKey = env["E2E_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!publishableKey || !serviceRoleKey) throw blocked();
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("E2E bloqueado: la clave pública debe ser una clave publicable.");
  }
  return { url: target.origin, publishableKey, serviceRoleKey };
}

/** Must run before creating any Supabase client or performing any network operation. */
export function requireIsolatedE2EConfig(): IsolatedE2EConfig {
  let linkedProjectId: string | undefined;
  try {
    const config = readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8");
    linkedProjectId = /^\s*project_id\s*=\s*"([a-z0-9_-]+)"\s*$/m.exec(config)?.[1];
  } catch {
    throw blocked();
  }
  if (!linkedProjectId) throw blocked();
  return validateIsolatedE2EConfig(process.env, linkedProjectId);
}
