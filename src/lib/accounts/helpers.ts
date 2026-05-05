import type { AccountSelectorOption, TradingAccount } from "@/lib/accounts/types";

export const ALL_ACCOUNTS_VALUE = "all";
export const MANUAL_ACCOUNT_VALUE = "manual";

export function getDefaultManualAccountOption(): AccountSelectorOption {
  return {
    value: MANUAL_ACCOUNT_VALUE,
    label: "Manual Journal",
    provider: "manual",
    status: "active",
    description: "Manual trades entered in TradeMind AI",
    isVirtual: true,
  };
}

export function getAccountLabel(account: TradingAccount) {
  return account.account_name || `${account.provider || "Manual"} Account`;
}

export function isManualAccount(account: TradingAccount | AccountSelectorOption) {
  return account.provider === "manual" || ("value" in account && account.value === MANUAL_ACCOUNT_VALUE);
}

export function isRealConnectedAccount(account: TradingAccount | AccountSelectorOption) {
  return account.provider !== "manual" && account.provider !== "all" && account.status === "active";
}

export function getAccountSelectorOptions(accounts: TradingAccount[]): AccountSelectorOption[] {
  const manualOption = getDefaultManualAccountOption();
  const hasManualAccount = accounts.some((account) => account.provider === "manual" || account.account_type === "manual");
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: getAccountLabel(account),
    provider: account.provider || "manual",
    status: account.status || "active",
    description: account.provider === "manual" ? "Manual trades entered in TradeMind AI" : `${account.provider || "external"} account`,
  }));

  return [
    {
      value: ALL_ACCOUNTS_VALUE,
      label: "All Accounts",
      provider: "all",
      status: "active",
      description: "All user-owned trading data",
    },
    ...(hasManualAccount ? [] : [manualOption]),
    ...accountOptions,
  ];
}

export function normalizeSelectedAccount(value: string | string[] | undefined, accounts: TradingAccount[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || rawValue === ALL_ACCOUNTS_VALUE) return ALL_ACCOUNTS_VALUE;
  if (rawValue === MANUAL_ACCOUNT_VALUE) return MANUAL_ACCOUNT_VALUE;
  return accounts.some((account) => account.id === rawValue) ? rawValue : ALL_ACCOUNTS_VALUE;
}
