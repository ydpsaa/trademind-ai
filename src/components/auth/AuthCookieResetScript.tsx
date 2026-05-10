"use client";

import { useEffect } from "react";

export function AuthCookieResetScript() {
  useEffect(() => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (name && /^sb-.+-auth-token(?:\.\d+)?$/.test(name)) {
        document.cookie = `${name}=; path=/; max-age=0`;
      }
    });
  }, []);

  return null;
}
