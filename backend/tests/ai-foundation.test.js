const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const test = require("node:test");

const registry = require("../../ai/memory/AGENT_REGISTRY.json");
const { createMemoryEngine, validateRecord } = require("../memory/memory.engine");
const router = require("../services/agent-router.service");
const ollama = require("../services/ollama.service");
const { createAiRouter } = require("../routes/ai.routes");
const memorySchema = require("../memory/memory.schema.json");

const promptDirectory = path.resolve(__dirname, "../../ai/agents/prompts");

function makeCollection() {
  const documents = [];
  return {
    documents,
    async createIndex() {},
    async insertOne(document) {
      const saved = { ...document, _id: `${documents.length + 1}` };
      documents.push(saved);
      return { insertedId: saved._id };
    },
    async findOne(filter) {
      return documents.find((document) => matches(document, filter)) || null;
    },
    async updateOne(filter, update) {
      const document = documents.find((item) => matches(item, filter));
      if (!document) return { modifiedCount: 0 };
      Object.assign(document, update.$set);
      return { modifiedCount: 1 };
    },
    find(filter) {
      let result = documents.filter((document) => matches(document, filter));
      return {
        sort() {
          result = [...result].sort(
            (left, right) => right.updatedAt - left.updatedAt,
          );
          return this;
        },
        limit(count) {
          result = result.slice(0, count);
          return this;
        },
        async toArray() {
          return result;
        },
      };
    },
  };
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$exists" in value) {
      return value.$exists ? key in document : !(key in document);
    }
    return document[key] === value;
  });
}

function makeResponse() {
  return {
    headersSent: false,
    statusCode: undefined,
    body: undefined,
    writeHead(statusCode) {
      this.statusCode = statusCode;
      this.headersSent = true;
    },
    end(body) {
      this.body = body;
    },
  };
}

function makeRequest({ method = "GET", url, body, token } = {}) {
  const request = Readable.from(
    body === undefined ? [] : [Buffer.from(JSON.stringify(body))],
  );
  request.method = method;
  request.url = url;
  request.headers = token
    ? {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      }
    : {};
  return request;
}

test("registry enables all 15 agents with loadable prompts", () => {
  const agents = router.listAgents();
  assert.equal(agents.length, 15);
  assert.equal(registry.agents.length, 15);
  assert.ok(agents.every((agent) => agent.enabled && agent.promptReady));
  for (const agent of registry.agents) {
    assert.equal(agent.enabled, true, `${agent.name} is disabled`);
    assert.ok(agent.capabilities.length, `${agent.name} has no declared capabilities`);
    const prompt = fs.readFileSync(
      path.resolve(__dirname, "../../", agent.prompt),
      "utf8",
    );
    for (const heading of [
      "## Rola",
      "## Cel",
      "## Zadania",
      "## Zakazy",
      "## Integracje",
      "## Workflow",
      "## Priorytety",
      "## Format odpowiedzi",
    ]) {
      assert.ok(prompt.includes(heading), `${agent.name} is missing ${heading}`);
    }
  }
  assert.equal(fs.readdirSync(promptDirectory).filter((file) => file.endsWith(".md")).length, 15);
});

test("agent router dispatches required intents and defaults to orchestrator", () => {
  const cases = [
    ["Przygotuj grafikę banera", "AI_GRAFIK_SZEF"],
    ["Popraw kod API", "AI_DEVELOPER"],
    ["Zaplanuj roadmapę i priorytety kwartalne", "AI_OWNER"],
    ["Obsłuż zgłoszenie błędu logowania", "AI_SUPPORT"],
    ["Przygotuj kampanię dla leadów sprzedażowych", "AI_SALES"],
    ["Zaplanuj kampanię marketingową", "AI_MARKETING"],
    ["Dodaj sitemap, robots.txt i schema.org", "AI_SEO"],
    ["Przygotuj posty na Facebook i TikTok", "AI_SOCIAL_MEDIA"],
    ["Przeanalizuj hurtownie i partnerów w CRM", "AI_CRM"],
    ["Napisz artykuł i landing page produktu", "AI_CONTENT"],
    ["Przeanalizuj konkurencję, trendy i nowe funkcje", "AI_RESEARCH"],
    ["Sprawdź Render i MongoDB Atlas", "AI_CLOUD"],
    ["Przeanalizuj strategię biznesową", "AI_BIZNES"],
    ["Sprawdź Cloudflare i DNS", "AI_CLOUD"],
    ["Dodaj kontakt do CRM", "AI_CRM"],
    ["Nieznane zapytanie o Qualitet", "AI_QUALITET"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(router.routeAgent(input).id, expected, input);
  }
  assert.throws(() => router.getAgentPrompt("../../../.env"), /Unknown AI agent/);
});

test("memory schema validates each section and rejects malformed records", () => {
  assert.deepEqual(Object.keys(memorySchema.sections), [
    "users",
    "projects",
    "companies",
    "prompts",
    "agents",
    "tasks",
    "history",
    "logs",
  ]);
  assert.equal(
    validateRecord("agents", {
      key: "AI_DEVELOPER",
      data: { agentId: "AI_DEVELOPER", name: "Developer", role: "developer" },
    }).valid,
    true,
  );
  assert.equal(
    validateRecord("users", { key: "bad key", data: { userId: "u1" } }).valid,
    false,
  );
  assert.equal(
    validateRecord("users", { key: "u1", data: {} }).valid,
    false,
  );
});

test("memory engine scopes data to owner and supports update, search, archive", async () => {
  const collections = new Map();
  const engine = createMemoryEngine({
    ownerId: "owner-a",
    getCollection: async (section) => {
      if (!collections.has(section)) collections.set(section, makeCollection());
      return collections.get(section);
    },
  });
  const created = await engine.create("projects", {
    key: "project-one",
    data: { projectId: "project-one", name: "Qualitet" },
    tags: ["core"],
  });
  assert.equal(created.ownerId, "owner-a");
  assert.equal((await engine.read("projects", "project-one")).data.name, "Qualitet");
  const updated = await engine.update("projects", "project-one", {
    context: "platform",
  });
  assert.equal(updated.data.context, "platform");
  assert.equal((await engine.search("projects", { query: "platform" })).length, 1);
  assert.equal(await engine.archive("projects", "project-one"), true);
  assert.equal(await engine.read("projects", "project-one"), null);
});

test("Ollama client validates and decodes generate, chat, embedding, and models", async (t) => {
  const originalFetch = global.fetch;
  const oldUrl = process.env.OLLAMA_URL;
  const oldModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_URL = "http://127.0.0.1:11434";
  process.env.OLLAMA_MODEL = "phi3";
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    const body = options.body ? JSON.parse(options.body) : null;
    let response;
    if (String(url).endsWith("/api/generate")) {
      response = { model: "phi3", response: "OK", done: true };
    } else if (String(url).endsWith("/api/chat")) {
      response = { model: "phi3", message: { role: "assistant", content: "Cześć" }, done: true };
    } else if (String(url).endsWith("/api/embed")) {
      response = { model: "phi3", embeddings: [[0.1, 0.2]] };
    } else if (String(url).endsWith("/api/tags")) {
      response = { models: [{ name: "phi3:latest" }] };
    } else {
      response = { version: "0.1.0" };
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.OLLAMA_URL;
    else process.env.OLLAMA_URL = oldUrl;
    if (oldModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = oldModel;
  });

  assert.equal((await ollama.generate({ prompt: "Test" })).response, "OK");
  assert.equal(
    (await ollama.chat({ messages: [{ role: "user", content: "Hej" }] })).message.content,
    "Cześć",
  );
  assert.deepEqual(
    (await ollama.embedding({ input: "tekst" })).embeddings,
    [[0.1, 0.2]],
  );
  assert.equal((await ollama.modelStatus()).available, true);
  assert.equal((await ollama.healthCheck()).available, true);
  assert.equal(requests.length, 5);
  assert.equal(requests[1].options.method, "POST");
});

test("AI API is protected and chat persists task, history, and log", async () => {
  const collections = new Map();
  const token = "test-ai-token";
  const aiRouter = createAiRouter({
    tokenProvider: () => token,
    ownerIdProvider: () => "test-owner",
    getCollection: async (section) => {
      if (!collections.has(section)) collections.set(section, makeCollection());
      return collections.get(section);
    },
    ollama: {
      async healthCheck() {
        return { available: true, version: "test" };
      },
      async modelStatus() {
        return { configuredModel: "phi3", available: true, models: ["phi3"] };
      },
      async chat({ messages }) {
        chatMessages = messages;
        return { model: "phi3", message: { content: "Odpowiedź testowa" } };
      },
    },
  });
  let chatMessages;

  const unauthorizedResponse = makeResponse();
  await aiRouter.handle(
    makeRequest({ url: "/api/ai/status" }),
    unauthorizedResponse,
  );
  assert.equal(unauthorizedResponse.statusCode, 401);

  const statusResponse = makeResponse();
  await aiRouter.handle(
    makeRequest({ url: "/api/ai/status", token }),
    statusResponse,
  );
  assert.equal(statusResponse.statusCode, 200);
  const status = JSON.parse(statusResponse.body);
  assert.equal(status.agentCount, 15);
  assert.equal(status.enabledAgentCount, 15);
  assert.equal(status.promptReadyAgentCount, 15);
  assert.equal(status.sharedProjectMemory.loaded, true);
  assert.equal(status.sharedProjectMemory.files.length, 10);

  const missingTokenRouter = createAiRouter({
    tokenProvider: () => "",
    getCollection: async () => makeCollection(),
  });
  const unconfiguredResponse = makeResponse();
  await missingTokenRouter.handle(
    makeRequest({ url: "/api/ai/status" }),
    unconfiguredResponse,
  );
  assert.equal(unconfiguredResponse.statusCode, 503);

  const chatResponse = makeResponse();
  await aiRouter.handle(
    makeRequest({
      method: "POST",
      url: "/api/ai/chat",
      token,
      body: { prompt: "Popraw kod API" },
    }),
    chatResponse,
  );
  assert.equal(chatResponse.statusCode, 200);
  const result = JSON.parse(chatResponse.body);
  assert.equal(result.agent, "AI_DEVELOPER");
  assert.equal(result.response, "Odpowiedź testowa");
  assert.equal(collections.get("tasks").documents[0].data.status, "completed");
  assert.equal(collections.get("history").documents.length, 1);
  assert.equal(collections.get("logs").documents.length, 1);
  for (const file of [
    "architecture_memory.json",
    "project_memory.json",
    "integration_memory.json",
    "business_memory.json",
    "roadmap_memory.json",
    "marketplace_memory.json",
    "partner_memory.json",
    "supplier_memory.json",
    "domain_memory.json",
    "prompt_memory.json",
  ]) {
    assert.ok(chatMessages[0].content.includes(file), `${file} was not loaded`);
  }
});
