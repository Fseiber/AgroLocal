import { describe, expect, it } from "vitest";
import { validateIsolatedE2EConfig } from "../../scripts/e2e/safety";

const linkedProject = "linked-project";
const isolated = () => ({
  E2E_SUPABASE_URL: "https://isolated-test.supabase.co",
  E2E_SUPABASE_PUBLISHABLE_KEY: "public-test-placeholder",
  E2E_SUPABASE_SERVICE_ROLE_KEY: "server-test-placeholder",
  E2E_ISOLATED_DATABASE: "true",
  E2E_CONFIRMED_URL: "https://isolated-test.supabase.co/",
});

describe("E2E isolation preflight (offline)", () => {
  it("refuses regular application configuration without test opt-in", () => {
    expect(() =>
      validateIsolatedE2EConfig({ SUPABASE_URL: "https://app.supabase.co" }, linkedProject),
    ).toThrow("E2E bloqueado");
  });

  it("requires explicit isolation and confirmation of the exact origin", () => {
    expect(() =>
      validateIsolatedE2EConfig({ ...isolated(), E2E_ISOLATED_DATABASE: "false" }, linkedProject),
    ).toThrow();
    expect(() =>
      validateIsolatedE2EConfig(
        { ...isolated(), E2E_CONFIRMED_URL: "https://other.supabase.co" },
        linkedProject,
      ),
    ).toThrow();
  });

  it("always blocks the linked Lovable backend", () => {
    expect(() =>
      validateIsolatedE2EConfig(
        {
          ...isolated(),
          E2E_SUPABASE_URL: `https://${linkedProject}.supabase.co`,
          E2E_CONFIRMED_URL: `https://${linkedProject}.supabase.co`,
        },
        linkedProject,
      ),
    ).toThrow("Lovable");
  });

  it.each(["SUPABASE_URL", "VITE_SUPABASE_URL"])("blocks the application's %s", (variable) => {
    expect(() =>
      validateIsolatedE2EConfig(
        { ...isolated(), [variable]: isolated().E2E_SUPABASE_URL },
        linkedProject,
      ),
    ).toThrow("backend de la aplicación");
  });

  it.each(["E2E_SUPABASE_PUBLISHABLE_KEY", "E2E_SUPABASE_SERVICE_ROLE_KEY"])(
    "never falls back to the application's credentials when %s is absent",
    (variable) => {
      expect(() =>
        validateIsolatedE2EConfig(
          { ...isolated(), [variable]: "", SUPABASE_SERVICE_ROLE_KEY: "unused-placeholder" },
          linkedProject,
        ),
      ).toThrow();
    },
  );

  it.each([
    "http://remote.supabase.co",
    "https://user:placeholder@isolated-test.supabase.co",
    "https://isolated-test.supabase.co/path",
    "https://isolated-test.supabase.co/?key=placeholder",
    "https://isolated-test.supabase.co/#fragment",
    "invalid-url",
  ])("rejects unsafe or malformed target URLs without echoing them", (url) => {
    expect(() =>
      validateIsolatedE2EConfig(
        { ...isolated(), E2E_SUPABASE_URL: url, E2E_CONFIRMED_URL: url },
        linkedProject,
      ),
    ).toThrow("E2E bloqueado: falta confirmar una base de pruebas aislada.");
  });

  it("fails closed if the linked project cannot be determined", () => {
    expect(() => validateIsolatedE2EConfig(isolated(), "")).toThrow();
  });

  it("rejects a server secret in the publishable slot", () => {
    expect(() =>
      validateIsolatedE2EConfig(
        { ...isolated(), E2E_SUPABASE_PUBLISHABLE_KEY: "sb_secret_placeholder" },
        linkedProject,
      ),
    ).toThrow("clave pública");
  });

  it("accepts a separately configured and explicitly confirmed isolated target", () => {
    expect(validateIsolatedE2EConfig(isolated(), linkedProject).url).toBe(
      "https://isolated-test.supabase.co",
    );
  });

  it("permits explicitly confirmed local Supabase without contacting it", () => {
    expect(
      validateIsolatedE2EConfig(
        {
          ...isolated(),
          E2E_SUPABASE_URL: "http://127.0.0.1:54321",
          E2E_CONFIRMED_URL: "http://127.0.0.1:54321/",
        },
        linkedProject,
      ).url,
    ).toBe("http://127.0.0.1:54321");
  });
});
