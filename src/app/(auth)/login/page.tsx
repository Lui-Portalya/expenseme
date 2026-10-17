import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Sign in</h2>
      <LoginForm />
    </>
  );
}
