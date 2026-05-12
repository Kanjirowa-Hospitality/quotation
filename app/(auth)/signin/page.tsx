"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getValidationError,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signInSchema,
} from "@/lib/validation/auth";

type AuthMode = "signin" | "forgot";
type ResetStep = "email" | "code";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };
    const validation = signInSchema.safeParse(payload);

    if (!validation.success) {
      setError(getValidationError(validation.error));
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });

    const data = await response.json().catch(() => ({ error: "Could not sign in." }));
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || "Could not sign in.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    router.replace(params.get("next") || "/");
    router.refresh();
  }

  async function onResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const validation = passwordResetRequestSchema.safeParse({
      email: formData.get("email"),
    });

    if (!validation.success) {
      setError(getValidationError(validation.error));
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = await response.json().catch(() => ({ error: "Could not send the verification code." }));
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || "Could not send the verification code.");
      return;
    }

    setResetEmail(data.email || validation.data.email);
    setResetStep("code");
    setMessage("Verification code sent to your email.");
  }

  async function onResetConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const validation = passwordResetConfirmSchema.safeParse({
      email: resetEmail,
      code: formData.get("code"),
      password: formData.get("password"),
    });

    if (!validation.success) {
      setError(getValidationError(validation.error));
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/auth/password-reset", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });
    const data = await response.json().catch(() => ({ error: "Could not reset the password." }));
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error || "Could not reset the password.");
      return;
    }

    setMode("signin");
    setResetStep("email");
    setResetEmail("");
    setMessage("Password reset. Sign in with your new password.");
  }

  function showSignIn() {
    setMode("signin");
    setResetStep("email");
    setError("");
    setMessage("");
  }

  function showForgotPassword() {
    setMode("forgot");
    setResetStep("email");
    setError("");
    setMessage("");
  }

  return (
    <section className="w-full rounded-md border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <LockKeyhole className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Sign in" : "Reset password"}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Access your Kanjirowa dashboard." : "Use your email verification code."}
          </p>
        </div>
      </div>

      {mode === "signin" && (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={showForgotPassword}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button className="h-9 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      )}

      {mode === "forgot" && resetStep === "email" && (
        <form className="space-y-4" onSubmit={onResetRequest}>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" name="email" type="email" autoComplete="email" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button className="h-9 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send verification code"}
          </Button>
          <Button className="h-9 w-full" type="button" variant="ghost" onClick={showSignIn}>
            Back to sign in
          </Button>
        </form>
      )}

      {mode === "forgot" && resetStep === "code" && (
        <form className="space-y-4" onSubmit={onResetConfirm}>
          <div className="space-y-2">
            <Label htmlFor="reset-code">Verification code</Label>
            <Input id="reset-code" name="code" inputMode="numeric" maxLength={6} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-new-password">New password</Label>
            <div className="relative">
              <Input
                id="reset-new-password"
                name="password"
                type={showResetPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowResetPassword((current) => !current)}
                aria-label={showResetPassword ? "Hide password" : "Show password"}
              >
                {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Button className="h-9 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Set new password"}
          </Button>
          <Button className="h-9 w-full" type="button" variant="ghost" onClick={showSignIn}>
            Back to sign in
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Need an account? Ask a super admin to create one.
      </p>
    </section>
  );
}
