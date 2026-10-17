import type { Metadata } from "next";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">Create your account</h2>
      <RegisterForm />
    </>
  );
}
