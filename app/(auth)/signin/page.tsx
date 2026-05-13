"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button, LoadingButton } from "@/components/ui/button";
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
type AuthErrorResponse = {
  error?: string;
  attemptsRemaining?: number;
};

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

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const data = await response.json().catch(() => ({ error: "Could not sign in." }));

      if (!response.ok) {
        const authError = data as AuthErrorResponse;
        setIsSubmitting(false);
        setError(authError.error || "Could not sign in.");
        if (typeof authError.attemptsRemaining === "number") {
          setMessage(
            authError.attemptsRemaining > 0
              ? `For your security, ${authError.attemptsRemaining} sign-in ${
                  authError.attemptsRemaining === 1 ? "attempt remains" : "attempts remain"
                } before this email is temporarily limited.`
              : "No sign-in attempts remain in this window. Please wait before trying again.",
          );
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/");
      router.refresh();
    } catch {
      setIsSubmitting(false);
      setError("Could not sign in.");
    }
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

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json().catch(() => ({ error: "Could not send the verification code." }));

      if (!response.ok) {
        setIsSubmitting(false);
        setError(data.error || "Could not send the verification code.");
        return;
      }

      setResetEmail(data.email || validation.data.email);
      setResetStep("code");
      setMessage("Verification code sent to your email.");
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setError("Could not send the verification code.");
    }
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

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json().catch(() => ({ error: "Could not reset the password." }));

      if (!response.ok) {
        setIsSubmitting(false);
        setError(data.error || "Could not reset the password.");
        return;
      }

      setMode("signin");
      setResetStep("email");
      setResetEmail("");
      setMessage("Password reset. Sign in with your new password.");
      setIsSubmitting(false);
    } catch {
      setIsSubmitting(false);
      setError("Could not reset the password.");
    }
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
    <section className="w-full">
      <div className="mb-12 flex items-center justify-center">
        <div className="relative h-56 w-72 flex items-center justify-center">
          <Image
            src="/main-logo.png"
            alt="Kanjirowa Hotelware and Essential Supplies"
            fill
            priority
            sizes="256px"
            className="object-center object-cover"
          />
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-normal">{mode === "signin" ? "Sign In" : "Reset Password"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {mode === "signin"
            ? "Access quotations, products, categories, and admin tools."
            : "Verify your email code and set a new password."}
        </p>
      </div>

      {mode === "signin" && (
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="h-12 rounded-full px-5"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={showForgotPassword}
                disabled={isSubmitting}
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
                className="h-12 rounded-full px-5 pr-12"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <LoadingButton
            className="h-12 w-full rounded-full text-sm"
            type="submit"
            loading={isSubmitting}
            loadingText="Signing in..."
          >
            Sign in
            <ArrowRight className="size-4" />
          </LoadingButton>
        </form>
      )}

      {mode === "forgot" && resetStep === "email" && (
        <form className="space-y-5" onSubmit={onResetRequest}>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              className="h-12 rounded-full px-5"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <LoadingButton
            className="h-12 w-full rounded-full text-sm"
            type="submit"
            loading={isSubmitting}
            loadingText="Sending..."
          >
            Send verification code
            <ArrowRight className="size-4" />
          </LoadingButton>
          <Button
            className="h-10 w-full rounded-full"
            type="button"
            variant="ghost"
            onClick={showSignIn}
            disabled={isSubmitting}
          >
            Back to sign in
          </Button>
        </form>
      )}

      {mode === "forgot" && resetStep === "code" && (
        <form className="space-y-5" onSubmit={onResetConfirm}>
          <div className="space-y-2">
            <Label htmlFor="reset-code">Verification code</Label>
            <Input
              id="reset-code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              className="h-12 rounded-full px-5"
              disabled={isSubmitting}
              required
            />
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
                className="h-12 rounded-full px-5 pr-12"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShowResetPassword((current) => !current)}
                aria-label={showResetPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <LoadingButton
            className="h-12 w-full rounded-full text-sm"
            type="submit"
            loading={isSubmitting}
            loadingText="Updating..."
          >
            Set new password
            <ArrowRight className="size-4" />
          </LoadingButton>
          <Button
            className="h-10 w-full rounded-full"
            type="button"
            variant="ghost"
            onClick={showSignIn}
            disabled={isSubmitting}
          >
            Back to sign in
          </Button>
        </form>
      )}

      <p className="mt-16 text-sm text-muted-foreground">
        Need an account? Ask a super admin to create one.
      </p>
    </section>
  );
}
