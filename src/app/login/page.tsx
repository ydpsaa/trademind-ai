import { Suspense } from "react";
import { AuthCookieResetScript } from "@/components/auth/AuthCookieResetScript";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthCookieResetScript />
      <AuthForm mode="login" />
    </Suspense>
  );
}
