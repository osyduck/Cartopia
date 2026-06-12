"use client";

import { SubmitButton } from "@/components/submit-button";

export function ActionForm({
  action,
  confirm,
  label,
  pendingText,
  variant = "ghost",
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirm?: string;
  label: string;
  pendingText?: string;
  variant?: "primary" | "danger" | "ghost";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <SubmitButton variant={variant} pendingText={pendingText}>
        {label}
      </SubmitButton>
    </form>
  );
}
