"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { login } from "@/lib/data";
import { Button, Input } from "@/components/ui";

/**
 * The sign-in screen.
 *
 * It lives at `/sign-in`, not `/login`: the agent owns `POST /login` and that
 * path is claimed by the rewrite proxy, so a page there would shadow the
 * endpoint the form has to post to.
 *
 * In open-dev mode (`./cortex up`) the agent accepts any body, so submitting
 * an empty field signs you in. The screen says so rather than leaving you
 * guessing at a password that was never set.
 */
/**
 * A full page load, not a client navigation. Crossing an auth boundary means
 * every cached RSC payload was fetched without a session; reloading is the
 * only way to be sure nothing stale survives.
 */
function enterApp(): void {
  window.location.replace("/");
}

export function SignIn() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [probing, setProbing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const probed = useRef(false);

  /**
   * Open-dev must not strand anyone behind a password that was never set.
   * `./cortex up` accepts any credential, so try once with an empty one: if it
   * succeeds this instance has no password and the user goes straight in. On a
   * password-protected instance it fails harmlessly and the form appears.
   */
  useEffect(() => {
    if (probed.current) return;
    probed.current = true;
    // No cancellation guard on purpose. In development React mounts effects
    // twice; cancelling on the first unmount meant the successful login never
    // navigated. Both outcomes here are idempotent, so let them land.
    login("")
      .then(enterApp)
      .catch(() => setProbing(false));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        await login(password);
        enterApp();
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "That password was not accepted.");
      } finally {
        setBusy(false);
      }
    },
    [password],
  );

  if (probing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="t-body text-text-muted">Connecting to CORTEX…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={submit}
        data-testid="sign-in-form"
        className="w-full max-w-[380px] border border-border bg-bg p-6"
      >
        <div className="mb-5 flex items-center gap-2.5">
          <span className="h-3 w-3 bg-blue" aria-hidden />
          <span className="font-heading text-[20px] font-medium tracking-[-1px] text-text">
            CORTEX
          </span>
        </div>

        <Input
          label="Password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Running in open-dev mode? Leave this empty and press Sign in."
          error={error ?? undefined}
        />

        <Button type="submit" variant="primary" block loading={busy} className="mt-4">
          Sign in
        </Button>

        <p className="t-caption mt-4 text-text-dim">
          If sign-in appears to succeed but the app keeps asking again, the session cookie is
          being dropped: a password-protected instance sets a <code>Secure</code> cookie, which
          the browser discards over plain http. Use https, or keep open-dev locally.
        </p>
      </form>
    </main>
  );
}
