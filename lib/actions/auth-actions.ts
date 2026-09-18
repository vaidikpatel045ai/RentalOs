"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function authenticate(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    // NEXT_REDIRECT is how Auth.js/Next.js signal a successful redirect —
    // it must be rethrown, not swallowed as an error.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    return { error: "Something went wrong. Please try again." };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
