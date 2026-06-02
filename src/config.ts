export type ScopusConfig = {
  apiKey: string;
  instToken?: string;
  baseUrl: string;
};

export function getConfig(): ScopusConfig {
  const apiKey = process.env.SCOPUS_API_KEY ?? process.env.ELSEVIER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing SCOPUS_API_KEY. Create an Elsevier API key and expose it as SCOPUS_API_KEY.",
    );
  }

  return {
    apiKey,
    instToken: process.env.SCOPUS_INST_TOKEN ?? process.env.ELSEVIER_INST_TOKEN,
    baseUrl: process.env.SCOPUS_API_BASE_URL ?? "https://api.elsevier.com",
  };
}
