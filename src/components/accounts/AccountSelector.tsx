import Link from "next/link";
import { ChevronDown, WalletCards } from "lucide-react";
import { getAccountSelectorOptions } from "@/lib/accounts/helpers";
import type { TradingAccount } from "@/lib/accounts/types";

interface AccountSelectorProps {
  accounts: TradingAccount[];
  selectedAccount: string;
  basePath: string;
  params?: Record<string, string | undefined>;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hrefFor(basePath: string, params: Record<string, string | undefined>, account: string) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  query.set("account", account);
  return `${basePath}?${query.toString()}`;
}

export function AccountSelector({ accounts, selectedAccount, basePath, params = {} }: AccountSelectorProps) {
  const options = getAccountSelectorOptions(accounts);
  const activeOption = options.find((option) => option.value === selectedAccount) ?? options[0];
  const externalAccounts = options.filter((option) => option.provider !== "all" && option.provider !== "manual");

  return (
    <details className="group relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white shadow-inner shadow-white/5 transition hover:bg-white/[0.09] [&::-webkit-details-marker]:hidden">
        <WalletCards className="h-4 w-4 text-zinc-400" />
        {activeOption.label}
        <ChevronDown className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">Trading Account</div>
        <div className="space-y-1">
          {options.map((option) => (
            <Link
              key={option.value}
              href={hrefFor(basePath, params, option.value)}
              className={`block rounded-xl border px-3 py-2.5 transition ${selectedAccount === option.value ? "border-white/15 bg-white/12 text-white" : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-zinc-400">{titleCase(String(option.provider))}</span>
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{option.description}</div>
            </Link>
          ))}
        </div>
        {!externalAccounts.length ? (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-500">
            Broker and exchange accounts will appear here after connection.
          </div>
        ) : null}
      </div>
    </details>
  );
}
