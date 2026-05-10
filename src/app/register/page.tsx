import { Suspense } from "react";
import { AuthCookieResetScript } from "@/components/auth/AuthCookieResetScript";
import { AuthForm } from "@/components/auth/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthCookieResetScript />
      <AuthForm mode="register" />
    </Suspense>
  );
}
