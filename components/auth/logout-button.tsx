"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logoutAction();
      if (!result.ok) setError(result.error);
    });
  }

  return <form onSubmit={submit} className="mt-8"><Button type="submit" variant="danger" disabled={pending}>{pending ? "Signing out..." : "Sign out"}</Button>{error ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-sm leading-5 text-[var(--danger)]" role="alert"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p> : null}</form>;
}
