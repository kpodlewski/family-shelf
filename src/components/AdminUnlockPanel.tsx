"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type AdminSessionResponse = {
  adminToken?: string;
  error?: string;
};

const adminStorageKey = "family-shelf:admin-session";

export function AdminUnlockPanel() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedToken = window.localStorage.getItem(adminStorageKey);

      if (!storedToken) {
        setIsHydrated(true);
        return;
      }

      async function verifyStoredToken() {
        setIsVerifying(true);

        try {
          const response = await fetch("/api/admin-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ adminToken: storedToken }),
          });
          const payload = (await response.json()) as AdminSessionResponse;

          if (response.ok && payload.adminToken) {
            setAdminToken(payload.adminToken);
            window.localStorage.setItem(adminStorageKey, payload.adminToken);
          } else {
            window.localStorage.removeItem(adminStorageKey);
          }
        } catch {
          window.localStorage.removeItem(adminStorageKey);
        } finally {
          setIsVerifying(false);
          setIsHydrated(true);
        }
      }

      void verifyStoredToken();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as AdminSessionResponse;

      if (!response.ok || !payload.adminToken) {
        setError(payload.error ?? "Could not unlock admin mode.");
        return;
      }

      setAdminToken(payload.adminToken);
      setPassword("");
      window.localStorage.setItem(adminStorageKey, payload.adminToken);
    } catch {
      setError("Could not reach the admin check. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearUnlock() {
    window.localStorage.removeItem(adminStorageKey);
    setAdminToken(null);
    setPassword("");
    setError(null);
  }

  if (!isHydrated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Checking admin unlock...</p>
      </div>
    );
  }

  if (adminToken) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="grid gap-2">
          <h2 className="text-lg font-semibold text-emerald-950">Admin mode unlocked</h2>
          <p className="text-sm text-emerald-800">
            Destructive catalog actions can be shown in the item catalog for this browser.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/items"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Go to items
          </Link>
          <button
            type="button"
            onClick={clearUnlock}
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-950"
          >
            Clear admin unlock
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Unlock admin mode</h2>
        <p className="text-sm text-slate-600">
          Enter the admin password to allow protected catalog actions in this browser.
        </p>
      </div>

      <form onSubmit={submitUnlock} className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Admin password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || isVerifying}
          className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting || isVerifying ? "Checking..." : "Unlock admin mode"}
        </button>
      </form>
    </section>
  );
}
