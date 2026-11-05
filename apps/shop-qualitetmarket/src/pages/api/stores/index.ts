import type { NextApiRequest, NextApiResponse } from "next";
import { createStore, listStoresForOwner } from "../../../server/store-repository";
import { getShopOwner } from "../../../server/shop-auth";
import { hasSameOrigin, isRecord } from "../../../server/shop-request";
import {
  normalizeStoreBusinessProfile,
  normalizeStoreGeneratedContent,
  normalizeStoreSeo,
  normalizeStoreSettings,
  type StoreDesign,
} from "../../../models/store";

type StoreAiResponse = {
  message?: { content?: unknown };
};

const svgElements = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "stop",
  "text",
  "tspan",
]);
const svgAttributes = new Set([
  "xmlns",
  "viewBox",
  "width",
  "height",
  "fill",
  "stroke",
  "stroke-width",
  "d",
  "transform",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "opacity",
  "offset",
  "stop-color",
  "stop-opacity",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "id",
]);

function safeSvgAttributeValue(name: string, value: string) {
  if (name === "xmlns") {
    return value === "http://www.w3.org/2000/svg";
  }
  if (["fill", "stroke", "stop-color"].includes(name)) {
    return /^(?:none|transparent|currentColor|#[0-9a-f]{3,8}|[a-z]{1,20})$/i.test(value);
  }
  if (name === "font-family") {
    return /^[a-zA-Z0-9 ,_-]{1,80}$/.test(value);
  }
  if (name === "id") {
    return /^[a-zA-Z][\w-]{0,40}$/.test(value);
  }
  if (name === "d") {
    return /^[a-zA-Z0-9 ,. +-]*$/.test(value);
  }
  if (name === "points" || name === "viewBox") {
    return /^[0-9 ,. +-]+$/.test(value);
  }
  if (name === "transform") {
    return /^[a-zA-Z0-9 (),. +-]*$/.test(value);
  }
  return /^[a-zA-Z0-9 %.,+ -]+$/.test(value);
}

function sanitizeGeneratedSvg(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 50_000 ||
    !/^<svg\b[\s\S]*<\/svg>$/.test(value.trim()) ||
    /<!|<script\b|<foreignObject\b|(?:href|style|on[a-z]+)\s*=|url\s*\(|javascript:/i.test(value)
  ) {
    throw new TypeError("AI returned unsafe or invalid SVG artwork.");
  }

  const stack: string[] = [];
  const sanitized = value.trim().replace(/<([^>]+)>/g, (tag, body: string) => {
    const closing = body.startsWith("/");
    const selfClosing = body.endsWith("/");
    const content = body.replace(/^\/|\/$/g, "").trim();
    const name = content.match(/^[A-Za-z][\w-]*/)?.[0];
    if (!name || !svgElements.has(name)) {
      throw new TypeError("AI returned unsupported SVG markup.");
    }
    if (closing) {
      if (content !== name || stack.pop() !== name) {
        throw new TypeError("AI returned malformed SVG markup.");
      }
      return `</${name}>`;
    }
    const rawAttributes = content.slice(name.length);
    const attributes: string[] = [];
    const attributePattern = /([A-Za-z][\w-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    for (const match of rawAttributes.matchAll(attributePattern)) {
      const attributeName = match[1];
      const attributeValue = match[3] ?? match[4] ?? "";
      if (
        !svgAttributes.has(attributeName) ||
        !safeSvgAttributeValue(attributeName, attributeValue)
      ) {
        throw new TypeError("AI returned unsafe SVG attributes.");
      }
      attributes.push(`${attributeName}="${attributeValue}"`);
    }
    if (rawAttributes.replace(attributePattern, "").replace(/\/$/, "").trim()) {
      throw new TypeError("AI returned invalid SVG attributes.");
    }
    if (!selfClosing) {
      stack.push(name);
    }
    return `<${name}${attributes.length ? ` ${attributes.join(" ")}` : ""}${selfClosing ? " />" : ">"}`;
  });
  if (stack.length || /<[^>]*$/.test(sanitized)) {
    throw new TypeError("AI returned incomplete SVG markup.");
  }
  return sanitized.replace(/>([^<]*)/g, (_match, text: string) =>
    `>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}`,
  );
}

async function generateStoreContent(input: {
  name: string;
  businessProfile: ReturnType<typeof normalizeStoreBusinessProfile>;
  locale: string;
  primaryColor: string;
  accentColor: string;
}) {
  const baseUrl = process.env.OLLAMA_URL?.trim();
  const model = process.env.OLLAMA_MODEL?.trim();
  if (!baseUrl || !model) {
    throw new Error("OLLAMA_URL and OLLAMA_MODEL are required to create an AI store.");
  }
  let endpoint: URL;
  try {
    endpoint = new URL("/api/chat", baseUrl);
  } catch {
    throw new Error("OLLAMA_URL must be a valid HTTP(S) URL.");
  }
  if (
    (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error("OLLAMA_URL must be a valid HTTP(S) URL without credentials.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_TOKEN?.trim()
        ? { Authorization: `Bearer ${process.env.OLLAMA_API_TOKEN.trim()}` }
        : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      options: { temperature: 0.6, num_predict: 4096 },
      messages: [
        {
          role: "system",
          content:
            "Create accurate store content in the user's selected language using only the supplied facts. Return only JSON with keys heroHeadline, heroDescription, about, seoTitle, seoDescription, categorySuggestions (3-8 objects with name and description), socialPost, facebookAd, googleAd, seoArticle, newsletterSubject, logoSvg, bannerSvg. Do not invent certifications, guarantees, prices, contact details, legal policies, or products. SVG values must be self-contained, simple, accessible SVG using only svg, g, path, rect, circle, ellipse, line, polyline, polygon, text, tspan and safe geometric/color/font attributes. Use solid colors only. No scripts, links, CSS, images, external resources, or embedded HTML.",
        },
        {
          role: "user",
          content: JSON.stringify({
            company: input.name,
            businessType: input.businessProfile.businessType,
            industry: input.businessProfile.industry,
            offerings: input.businessProfile.offerings,
            audience: input.businessProfile.targetAudience,
            style: input.businessProfile.style,
            country: input.businessProfile.country,
            language: input.locale,
            colors: {
              primary: input.primaryColor,
              accent: input.accentColor,
            },
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }
  const result = (await response.json()) as StoreAiResponse;
  if (typeof result.message?.content !== "string") {
    throw new Error("Ollama returned no generated content.");
  }
  let generated: unknown;
  try {
    generated = JSON.parse(result.message.content);
  } catch {
    throw new Error("Ollama returned invalid JSON for store content.");
  }
  if (!isRecord(generated)) {
    throw new Error("Ollama returned an invalid store content shape.");
  }
  const generatedContent = normalizeStoreGeneratedContent({
    heroHeadline: generated.heroHeadline,
    heroDescription: generated.heroDescription,
    about: generated.about,
    categorySuggestions: generated.categorySuggestions,
    socialPost: generated.socialPost,
    facebookAd: generated.facebookAd,
    googleAd: generated.googleAd,
    seoArticle: generated.seoArticle,
    newsletterSubject: generated.newsletterSubject,
  });
  const seo = normalizeStoreSeo({
    title: generated.seoTitle,
    description: generated.seoDescription,
  });
  const logo = sanitizeGeneratedSvg(generated.logoSvg);
  const banner = sanitizeGeneratedSvg(generated.bannerSvg);
  return {
    generatedContent,
    seo,
    logoUrl: `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`,
    bannerUrl: `data:image/svg+xml;base64,${Buffer.from(banner).toString("base64")}`,
  };
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export default async function storesHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  const owner = await getShopOwner(request);
  if (!owner) {
    return response.status(401).json({ error: "Wymagane jest zalogowanie." });
  }

  if (request.method === "GET") {
    try {
      const stores = await listStoresForOwner(owner.id);
      return response.status(200).json({
        stores: stores.map((store) => ({
          id: String(store._id),
          name: store.name,
          slug: store.slug,
          status: store.status,
        })),
      });
    } catch (error) {
      console.error(
        "Shop store listing failed:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return response.status(503).json({ error: "Nie udało się odczytać sklepów." });
    }
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }

  const body: unknown = request.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.slug !== "string"
  ) {
    return response.status(400).json({ error: "Podaj nazwę i slug sklepu." });
  }

  try {
    const businessProfile = normalizeStoreBusinessProfile(body.businessProfile);
    const store = await createStore({
      ownerUserId: owner.id,
      name: body.name,
      slug: body.slug,
      settings: normalizeStoreSettings(body.settings),
      businessProfile,
      ...(await generateStoreContent({
        name: body.name,
        businessProfile,
        locale:
          isRecord(body.settings) && typeof body.settings.locale === "string"
            ? body.settings.locale
            : "",
        primaryColor:
          isRecord(body.design) && typeof body.design.primaryColor === "string"
            ? body.design.primaryColor
            : "#172b4d",
        accentColor:
          isRecord(body.design) && typeof body.design.accentColor === "string"
            ? body.design.accentColor
            : "#c89b3c",
      }).then((generated) => ({
        generatedContent: generated.generatedContent,
        seo: generated.seo,
        design: {
          primaryColor:
            isRecord(body.design) && typeof body.design.primaryColor === "string"
              ? body.design.primaryColor
              : "#172b4d",
          accentColor:
            isRecord(body.design) && typeof body.design.accentColor === "string"
              ? body.design.accentColor
              : "#c89b3c",
          backgroundColor:
            isRecord(body.design) && typeof body.design.backgroundColor === "string"
              ? body.design.backgroundColor
              : "#ffffff",
          theme:
            isRecord(body.businessProfile) && body.businessProfile.style === "minimal"
              ? "minimal"
              : isRecord(body.businessProfile) &&
                  (body.businessProfile.style === "premium" ||
                    body.businessProfile.style === "luxury")
                ? "editorial"
                : "classic",
          logoUrl: generated.logoUrl,
          banners: [generated.bannerUrl],
        } satisfies StoreDesign,
      }))),
    });
    return response.status(201).json({ store: { id: String(store._id) } });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return response.status(409).json({
        error: "Sklep o takim slug lub domenie już istnieje.",
      });
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return response.status(400).json({ error: error.message });
    }
    console.error(
      "Shop store creation failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({ error: "Nie udało się utworzyć sklepu." });
  }
}
