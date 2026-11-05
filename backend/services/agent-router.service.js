const fs = require("node:fs");
const path = require("node:path");

const registry = require("../../ai/memory/AGENT_REGISTRY.json");

const routePatterns = {
  AI_GRAFIK_SZEF: /\b(grafik\w*|logo|baner\w*|branding|projektowanie wizualne)\b/,
  AI_DEVELOPER: /\b(kod\w*|program\w*|bug\w*|api|next\.?js|typescript|javascript|backend|frontend|implement\w*|schema mongo\w*|mongodb schema)\b/,
  AI_SOCIAL_MEDIA: /\b(social media|media spolecznosciowe|instagram|facebook|tiktok|youtube|linkedin|posty spolecznosciowe|reels|shorts)\b/,
  AI_CLOUD: /\b(cloudflare|dns|ssl|tls|waf|cdn|subdomen\w*|render|deploy\w*|mongodb atlas|mongo db atlas|infrastruktur\w*)\b/,
  AI_CRM: /\b(crm|kontakt\w*|klient\w*|firm\w*|hurtown\w*|dostawc\w*|partner\w*|company|supplier|wholesaler)\b/,
  AI_SALES: /\b(sprzedaz|sprzedaw\w*|ofert\w*|konwersj\w*|prospekt\w*|lead\w*|lejk\w*|kampani\w* sprzedaz\w*)\b/,
  AI_SEO: /\b(seo|pozycjon\w*|slowa kluczowe|indeksacj\w*|backlink\w*|meta.?tag\w*|sitemap|robots\.txt|schema\.org|dane strukturalne)\b/,
  AI_BIZNES: /\b(biznes\w*|strateg\w*|rentown\w*|marz\w*|model biznes\w*|business model)\b/,
  AI_MARKETING: /\b(marketing\w*|kampani\w*|reklam\w*|promocj\w*|segmentacj\w*|google ads|marketing facebook|marketing tiktok|marketing youtube)\b/,
  AI_RESEARCH: /\b(research|badani\w*|analiz\w* rynku|konkurenc\w*|trend\w*|nowe funkcj\w*|nowe feature\w*)\b/,
  AI_SUPPORT: /\b(wsparci\w*|pomoc\w*|problem\w* uzytkownik\w*|reklamacj\w*|ticket\w*|zgloszeni\w*|blad\w*|error\w*|incydent\w*)\b/,
  AI_HELPDESK: /\b(helpdesk|centrum pomocy|baza wiedzy|instrukcj\w* dla uzytkownik\w*)\b/,
  AI_CONTENT: /\b(tresc\w*|artykul\w*|copywriting|opis produktu|produkty|landing page\w*|stron\w* docelow\w*|redag\w*)\b/,
  AI_OWNER: /\b(wlasciciel\w*|owner|decyzj\w* zarzadc\w*|priorytet\w*|roadmap\w*|raport\w*|zadani\w*|plan prac\w*)\b/,
};
const routePriority = [
  "AI_OWNER",
  "AI_DEVELOPER",
  "AI_CLOUD",
  "AI_SEO",
  "AI_RESEARCH",
  "AI_SUPPORT",
  "AI_HELPDESK",
  "AI_CRM",
  "AI_SALES",
  "AI_SOCIAL_MEDIA",
  "AI_CONTENT",
  "AI_GRAFIK_SZEF",
  "AI_BIZNES",
  "AI_MARKETING",
];

if (
  !Array.isArray(registry.agents) ||
  !registry.agents.length ||
  registry.orchestrator !== "AI_QUALITET"
) {
  throw new Error("AI agent registry is invalid.");
}

const registeredAgents = registry.agents.map((entry) => {
  if (
    typeof entry.name !== "string" ||
    typeof entry.role !== "string" ||
    typeof entry.enabled !== "boolean" ||
    typeof entry.prompt !== "string" ||
    !Array.isArray(entry.capabilities)
  ) {
    throw new Error("AI agent registry contains an invalid entry.");
  }
  return {
    id: entry.name,
    role: entry.role,
    enabled: entry.enabled,
    capabilities: entry.capabilities,
    prompt: entry.prompt,
  };
});

const orchestrator = registeredAgents.find(
  (agent) => agent.id === registry.orchestrator,
);
if (!orchestrator || !orchestrator.enabled) {
  throw new Error("The AI orchestrator must be enabled in the registry.");
}

const agentIds = new Set(registeredAgents.map(({ id }) => id));
const orchestratorRoute = { id: orchestrator.id, role: orchestrator.role };
const routingAgents = routePriority.map((id) => {
  const agent = registeredAgents.find((entry) => entry.id === id);
  if (!agent || !routePatterns[id]) {
    throw new Error(`AI agent ${id} is missing a routing rule.`);
  }
  return agent;
});

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0142|\u0141/g, "l")
    .toLocaleLowerCase("pl-PL");
}

function routeAgent(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { ...orchestratorRoute, reason: "empty_or_invalid_request" };
  }

  const normalized = normalizeText(input);
  for (const agent of routingAgents) {
    const match = routePatterns[agent.id];
    if (agent.enabled && match?.test(normalized)) {
      return { id: agent.id, role: agent.role, reason: "matched_specialist_intent" };
    }
  }
  return { ...orchestratorRoute, reason: "no_specialist_match" };
}

function listAgents() {
  return registeredAgents.map((agent) => {
    const promptPath = path.resolve(__dirname, "../../", agent.prompt);
    const promptAvailable = Boolean(fs.readFileSync(promptPath, "utf8").trim());
    return {
      id: agent.id,
      role: agent.role,
      enabled: agent.enabled,
      capabilities: agent.capabilities,
      promptAvailable,
      promptReady: agent.enabled && promptAvailable,
    };
  });
}

function getAgentPrompt(agentId) {
  const agent = registeredAgents.find(({ id }) => id === agentId);
  if (!agentIds.has(agentId) || !agent?.enabled) {
    throw new TypeError("Unknown AI agent.");
  }

  const promptPath = path.resolve(__dirname, "../../", agent.prompt);
  const prompt = fs.readFileSync(promptPath, "utf8").trim();
  if (!prompt) throw new Error(`Prompt for ${agentId} is empty.`);
  return prompt;
}

module.exports = { getAgentPrompt, listAgents, routeAgent };
