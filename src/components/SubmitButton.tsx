"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "./ui";

export function SubmitButton({ children, pendingText = "Saving…", className = btnPrimary }: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Submit button that asks for confirmation first (used for destructive forms). */
export function ConfirmButton({ children, message, className }: {
  children: React.ReactNode;
  message: string;
  className: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
