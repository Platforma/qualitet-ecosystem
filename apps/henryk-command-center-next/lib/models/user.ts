export const accountTypes = [
  "customer",
  "company",
  "store",
  "wholesaler",
  "service_provider",
  "partner",
  "advertiser",
] as const;

export type AccountType = (typeof accountTypes)[number];
