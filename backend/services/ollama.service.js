class OllamaError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "OllamaError";
    this.statusCode = statusCode;
  }
}

function getBaseUrl() {
  let url;
  try {
    url = new URL(process.env.OLLAMA_URL || "http://127.0.0.1:11434");
  } catch {
    throw new OllamaError("OLLAMA_URL is not a valid URL.", 503);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new OllamaError(
      "OLLAMA_URL must be an HTTP(S) base URL without credentials.",
      503,
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
  return url.toString().replace(/\/$/, "");
}

async function request(
  path,
  { method = "GET", body, timeoutMs = 30_000 } = {},
) {
  let response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof OllamaError) throw error;
    const message =
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "TimeoutError"
        ? "Ollama request timed out."
        : "Ollama service is unavailable.";
    throw new OllamaError(message, 503);
  }

  if (!response.ok) {
    throw new OllamaError(
      response.status === 404
        ? "Ollama endpoint or model was not found."
        : `Ollama returned HTTP ${response.status}.`,
      response.status >= 500 ? 503 : 502,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new OllamaError("Ollama returned invalid JSON.", 502);
  }
}

function requireModel(model) {
  const selected = model || process.env.OLLAMA_MODEL;
  if (
    typeof selected !== "string" ||
    !selected.trim() ||
    selected.length > 128 ||
    /[\r\n]/.test(selected)
  ) {
    throw new TypeError("A valid Ollama model name is required.");
  }
  return selected.trim();
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

async function generate({ model, prompt, system, options } = {}) {
  const selectedModel = requireModel(model);
  const payload = {
    model: selectedModel,
    prompt: requireText(prompt, "prompt"),
    stream: false,
  };
  if (system !== undefined) payload.system = requireText(system, "system");
  if (options !== undefined) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options must be an object.");
    }
    payload.options = options;
  }

  const result = await request("/api/generate", {
    method: "POST",
    body: payload,
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000,
  });
  if (typeof result.response !== "string") {
    throw new OllamaError("Ollama generate response is missing text.", 502);
  }
  return {
    model: result.model || selectedModel,
    response: result.response,
    done: result.done === true,
    totalDuration: result.total_duration,
  };
}

async function chat({ model, messages, options } = {}) {
  const selectedModel = requireModel(model);
  if (
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > 100 ||
    messages.some(
      (message) =>
        !message ||
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim(),
    )
  ) {
    throw new TypeError("messages must contain 1-100 valid chat messages.");
  }

  const payload = {
    model: selectedModel,
    messages: messages.map(({ role, content }) => ({ role, content })),
    stream: false,
  };
  if (options !== undefined) {
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options must be an object.");
    }
    payload.options = options;
  }

  const result = await request("/api/chat", {
    method: "POST",
    body: payload,
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000,
  });
  if (typeof result.message?.content !== "string") {
    throw new OllamaError("Ollama chat response is missing message text.", 502);
  }
  return {
    model: result.model || selectedModel,
    message: result.message,
    done: result.done === true,
    totalDuration: result.total_duration,
  };
}

async function embedding({ model, input } = {}) {
  const selectedModel = requireModel(model || process.env.OLLAMA_EMBEDDING_MODEL);
  const validInput =
    (typeof input === "string" && input.trim()) ||
    (Array.isArray(input) &&
      input.length > 0 &&
      input.length <= 128 &&
      input.every((item) => typeof item === "string" && item.trim()));
  if (!validInput) {
    throw new TypeError("input must be a non-empty string or string array.");
  }

  const result = await request("/api/embed", {
    method: "POST",
    body: { model: selectedModel, input },
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 120_000,
  });
  if (
    !Array.isArray(result.embeddings) ||
    !result.embeddings.every(
      (vector) =>
        Array.isArray(vector) && vector.every((value) => Number.isFinite(value)),
    )
  ) {
    throw new OllamaError("Ollama embedding response is invalid.", 502);
  }
  return { model: result.model || selectedModel, embeddings: result.embeddings };
}

async function modelStatus(model) {
  const configuredModel = requireModel(model);
  const result = await request("/api/tags", { timeoutMs: 10_000 });
  if (!Array.isArray(result.models)) {
    throw new OllamaError("Ollama model list response is invalid.", 502);
  }

  const models = result.models
    .filter((entry) => entry && typeof entry.name === "string")
    .map((entry) => entry.name);
  return {
    configuredModel,
    available: models.some(
      (name) =>
        name === configuredModel ||
        name.startsWith(`${configuredModel}:`) ||
        configuredModel.startsWith(`${name}:`),
    ),
    models,
  };
}

async function healthCheck() {
  try {
    const result = await request("/api/version", { timeoutMs: 5_000 });
    return {
      available: typeof result.version === "string",
      version: typeof result.version === "string" ? result.version : null,
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      error:
        error instanceof OllamaError ? error.message : "Ollama is unavailable.",
    };
  }
}

module.exports = {
  OllamaError,
  chat,
  embedding,
  generate,
  healthCheck,
  modelStatus,
};