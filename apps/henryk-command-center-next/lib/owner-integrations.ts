export const ownerIntegrations = [
  {
    id: "mongodb",
    label: "MongoDB",
    fields: [
      { key: "uri", label: "MongoDB URI", type: "password", secret: true },
      { key: "databaseName", label: "Nazwa bazy danych", type: "text" },
    ],
  },
  {
    id: "render",
    label: "Render",
    fields: [
      { key: "apiKey", label: "RENDER_API_KEY", type: "password", secret: true },
      { key: "serviceId", label: "RENDER_SERVICE_ID", type: "text" },
      { key: "deployHook", label: "RENDER_DEPLOY_HOOK", type: "password", secret: true },
    ],
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    fields: [
      { key: "apiToken", label: "API token", type: "password", secret: true },
      { key: "zoneId", label: "Zone ID", type: "text" },
    ],
  },
  {
    id: "discord",
    label: "Discord",
    fields: [
      { key: "botToken", label: "Bot token", type: "password", secret: true },
      { key: "webhookUrl", label: "Webhook URL", type: "password", secret: true },
    ],
  },
  {
    id: "stripe",
    label: "Stripe",
    fields: [
      { key: "secretKey", label: "Secret key", type: "password", secret: true },
      { key: "webhookSecret", label: "Webhook signing secret", type: "password", secret: true },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    fields: [
      { key: "accessToken", label: "Page access token", type: "password", secret: true },
      { key: "pageId", label: "Page ID", type: "text" },
    ],
  },
  {
    id: "metaAds",
    label: "Meta Ads",
    fields: [
      { key: "accessToken", label: "Access token", type: "password", secret: true },
      { key: "adAccountId", label: "Ad account ID", type: "text" },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    fields: [
      { key: "accessToken", label: "Access token", type: "password", secret: true },
      { key: "advertiserId", label: "Advertiser ID", type: "text" },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    fields: [
      { key: "clientId", label: "OAuth client ID", type: "text" },
      { key: "clientSecret", label: "OAuth client secret", type: "password", secret: true },
      { key: "refreshToken", label: "OAuth refresh token", type: "password", secret: true },
      { key: "channelId", label: "Channel ID", type: "text" },
    ],
  },
  {
    id: "ollama",
    label: "Ollama",
    fields: [
      { key: "baseUrl", label: "Adres Ollama", type: "url" },
      { key: "model", label: "Model", type: "text" },
    ],
  },
] as const;

export type OwnerIntegrationId = (typeof ownerIntegrations)[number]["id"];

export const requiredOwnerIntegrationFields: Record<OwnerIntegrationId, string[]> = {
  mongodb: ["uri"],
  render: ["apiKey", "serviceId"],
  cloudflare: ["apiToken"],
  discord: ["botToken"],
  stripe: ["secretKey"],
  facebook: ["accessToken", "pageId"],
  metaAds: ["accessToken", "adAccountId"],
  tiktok: ["accessToken"],
  youtube: ["clientId", "clientSecret", "refreshToken"],
  ollama: ["baseUrl"],
};

export function isOwnerIntegrationConfigured(
  id: OwnerIntegrationId,
  configuredFields: string[],
) {
  if (id === "render") {
    return (
      (configuredFields.includes("apiKey") && configuredFields.includes("serviceId")) ||
      configuredFields.includes("deployHook")
    );
  }
  if (id === "discord") {
    return configuredFields.includes("botToken") || configuredFields.includes("webhookUrl");
  }
  return requiredOwnerIntegrationFields[id].every((field) =>
    configuredFields.includes(field),
  );
}

export function getOwnerIntegration(id: string) {
  return ownerIntegrations.find((integration) => integration.id === id);
}
