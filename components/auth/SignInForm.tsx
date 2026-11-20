"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

import AuthCard from "./AuthCard";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInState = {
  error: string | null;
  fieldErrors: Partial<Record<"email" | "password", string>>;
};

const initialState: SignInState = { error: null, fieldErrors: {} };

export default function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });

  const signIn = async (
    _previous: SignInState,
    formData: FormData,
  ): Promise<SignInState> => {
    const parsed = signInSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors: SignInState["fieldErrors"] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password") {
          fieldErrors[field] ??= issue.message;
        }
      }
      return { error: null, fieldErrors };
    }

    const { error } = await authClient.signIn.email(parsed.data);
    if (error) {
      const message =
        error.message || "Unable to sign in. Check your details and try again.";
      toast.error(message);
      return { error: message, fieldErrors: {} };
    }

    toast.success("Signed in");
    const destination = String(formData.get("next") ?? "") || next || "/";
    router.push(destination);
    router.refresh();
    return initialState;
  };

  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <AuthCard
      title="Sign in"
      description="Enter your email and password to access your account"
      next={next}
      crossLink={{
        prompt: "Don't have an account?",
        label: "Sign up",
        href: "/sign-up",
      }}
    >
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <AuthField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="you@example.com"
          value={values.email}
          onChange={(value) =>
            setValues((current) => ({ ...current, email: value }))
          }
          onBlur={() => {}}
          isInvalid={Boolean(state.fieldErrors.email)}
          errors={
            state.fieldErrors.email
              ? [{ message: state.fieldErrors.email }]
              : []
          }
        />
        <AuthField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          enterKeyHint="done"
          value={values.password}
          onChange={(value) =>
            setValues((current) => ({ ...current, password: value }))
          }
          onBlur={() => {}}
          isInvalid={Boolean(state.fieldErrors.password)}
          errors={
            state.fieldErrors.password
              ? [{ message: state.fieldErrors.password }]
              : []
          }
        />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <AuthSubmitButton pendingLabel="Signing in…">Sign in</AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
