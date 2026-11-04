const fs = require("node:fs");
const path = require("node:path");

const promptDirectory = path.resolve(__dirname, "../../ai/agents/prompts");

const agents = [
  { id: "AI_GRAFIK_SZEF", role: "designer", match: /\b(grafik\w*|logo|baner\w*|branding|projektowanie wizualne)\b/ },
  { id: "AI_DEVELOPER", role: "developer", match: /\b(kod\w*|program\w*|bug\w*|api|typescript|javascript|backend|frontend|implement\w*)\b/ },
  { id: "AI_SOCIAL_MEDIA", role: "social-media", match: /\b(social media|media spolecznosciowe|instagram|facebook|tiktok|linkedin|posty spolecznosciowe)\b/ },
  { id: "AI_CLOUD", role: "cloud", match: /\b(cloudflare|dns|ssl|waf|cdn|subdomen\w*)\b/ },
  { id: "AI_CRM", role: "crm", match: /\b(crm|kontakt\w*|lead\w*|pipeline|relacj\w* z klient\w*)\b/ },
  { id: "AI_SALES", role: "sales", match: /\b(sprzedaz|sprzedaw\w*|ofert\w*|konwersj\w*|prospekt\w*)\b/ },
  { id: "AI_SEO", role: "seo", match: /\b(seo|pozycjon\w*|slowa kluczowe|indeksacj\w*|backlink\w*)\b/ },
  { id: "AI_BIZNES", role: "business", match: /\b(biznes\w*|strateg\w*|rentown\w*|marz\w*|model biznes\w*)\b/ },
  { id: "AI_MARKETING", role: "marketing", match: /\b(marketing\w*|kampani\w*|reklam\w*|promocj\w*|segmentacj\w*)\b/ },
  { id: "AI_RESEARCH", role: "research", match: /\b(research|badani\w*|analiz\w* rynku|konkurenc\w*|trend\w*)\b/ },
  { id: "AI_SUPPORT", role: "support", match: /\b(wsparci\w*|pomoc\w*|problem\w* uzytkownik\w*|reklamacj\w*)\b/ },
  { id: "AI_HELPDESK", role: "helpdesk", match: /\b(helpdesk|ticket\w*|zgloszeni\w*|incydent\w*)\b/ },
  { id: "AI_CONTENT", role: "content", match: /\b(tresc\w*|artykul\w*|copywriting|opis produktu|redag\w*)\b/ },
  { id: "AI_OWNER", role: "owner", match: /\b(wlasciciel\w*|owner|decyzj\w* zarzadc\w*|priorytet\w* platform\w*)\b/ },
];

const orchestrator = { id: "AI_QUALITET", role: "orchestrator" };
const agentIds = new Set([...agents.map(({ id }) => id), orchestrator.id]);

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pl-PL");
}

function routeAgent(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { ...orchestrator, reason: "empty_or_invalid_request" };
  }

  const normalized = normalizeText(input);
  for (const agent of agents) {
    if (agent.match.test(normalized)) {
      return { id: agent.id, role: agent.role, reason: "matched_specialist_intent" };
    }
  }
  return { ...orchestrator, reason: "no_specialist_match" };
}

function listAgents() {
  return [
    orchestrator,
    ...agents.map(({ id, role }) => ({ id, role })),
  ].map((agent) => {
    let promptAvailable = false;
    try {
      promptAvailable = fs
        .readFileSync(path.join(promptDirectory, `${agent.id}.md`), "utf8")
        .trim().length > 0;
    } catch {
      promptAvailable = false;
    }
    return { ...agent, promptAvailable };
  });
}

function getAgentPrompt(agentId) {
  if (!agentIds.has(agentId)) {
    throw new TypeError("Unknown AI agent.");
  }

  const promptPath = path.join(promptDirectory, `${agentId}.md`);
  const prompt = fs.readFileSync(promptPath, "utf8").trim();
  if (!prompt) throw new Error(`Prompt for ${agentId} is empty.`);
  return prompt;
}

module.exports = { getAgentPrompt, listAgents, routeAgent };
