"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

import AuthCard from "./AuthCard";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";

const signUpSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpState = {
  error: string | null;
  fieldErrors: Partial<Record<"name" | "email" | "password", string>>;
};

const initialState: SignUpState = { error: null, fieldErrors: {} };

export default function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });

  const signUp = async (
    _previous: SignUpState,
    formData: FormData,
  ): Promise<SignUpState> => {
    const parsed = signUpSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors: SignUpState["fieldErrors"] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "email" || field === "password") {
          fieldErrors[field] ??= issue.message;
        }
      }
      return { error: null, fieldErrors };
    }

    const { error } = await authClient.signUp.email(parsed.data);
    if (error) {
      const message =
        error.message ||
        "Unable to create your account. Check your details and try again.";
      toast.error(message);
      return { error: message, fieldErrors: {} };
    }

    toast.success("Account created");
    const destination = String(formData.get("next") ?? "") || next || "/wizard";
    router.push(destination);
    router.refresh();
    return initialState;
  };

  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <AuthCard
      title="Sign up"
      description="Create an account to start tracking your budget"
      next={next}
      crossLink={{
        prompt: "Already have an account?",
        label: "Sign in",
        href: "/sign-in",
      }}
    >
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <AuthField
          name="name"
          label="Name"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          placeholder="Your name"
          value={values.name}
          onChange={(value) =>
            setValues((current) => ({ ...current, name: value }))
          }
          onBlur={() => {}}
          isInvalid={Boolean(state.fieldErrors.name)}
          errors={
            state.fieldErrors.name ? [{ message: state.fieldErrors.name }] : []
          }
        />
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
          required
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
          autoComplete="new-password"
          enterKeyHint="done"
          required
          minLength={8}
          placeholder="At least 8 characters"
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
        <AuthSubmitButton pendingLabel="Creating account…">
          Sign up
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
