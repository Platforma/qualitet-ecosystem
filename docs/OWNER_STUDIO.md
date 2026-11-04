# Owner Studio

Owner Studio is the owner-only administration surface for Henryk Command Center. New platform capabilities that need ongoing configuration or operational control should include a corresponding Owner Studio section and an owner-authorized API; do not make routine administration depend on editing source files.

## Current sections

- **AI Prompts** — browse and edit project prompts, test with Ollama, restore the captured default, and review saved versions.
- **System Config / Integrations** — update supported runtime settings and integration credentials. Integration secrets are encrypted server-side and are never returned to the browser.
- **MongoDB / CRM / Marketplace** — inspect collections and records, edit supported CRM and marketplace fields, manage documents and fields, import/export JSON, and create or remove non-protected collections.
- **AI Agents** — edit saved agent prompts, models, and roles.
- **Files Center / Owner Command** — browse allowed text files, search and replace with a preview, and request an AI proposal. Every proposed source change requires owner confirmation.
- **Git / Deploy** — use the local checkout for Git operations and configured GitHub Actions or Render APIs for deployment.
- **Ads Center** — review Meta and Google Ads account/campaign metrics and create campaigns in the paused state. The public OLX API does not expose ad-account reporting; Allegro Ads reporting requires access to its official Ads API.

## Runtime requirements and limitations

- Owner API routes require an authenticated user with the `owner` role and a working MongoDB connection.
- Prompt testing and AI file proposals require `OLLAMA_URL` and `OLLAMA_MODEL` (or values saved in System Config).
- Meta Ads requires a Meta access token and an ad-account ID. Google Ads requires a JSON secret containing `developerToken`, `clientId`, `clientSecret`, `refreshToken`, and optionally `loginCustomerId`, plus the Google Ads Customer ID.
- Render deploy/status requires `RENDER_API_KEY` and `RENDER_SERVICE_ID`.
- GitHub Actions status/dispatch requires `GITHUB_PAT` and `GITHUB_DEPLOY_WORKFLOW`; `GITHUB_REPOSITORY` defaults to `Platforma/qualitet-ecosystem`.
- Files Center writes to the application process's project directory, and Git Center runs against a local Git checkout. On ephemeral or source-free hosting, those source edits and local Git operations are not a durable production workflow; configure a persistent writable checkout before relying on them.
- Campaign creation through Ads Center is restricted to Meta and Google Ads and leaves campaigns paused. Credentials, account permissions, provider API access, and billing remain requirements of the respective provider.

## Data safety

Database exports, imports, collection changes, and external deploy/ad operations are owner-only and recorded in the audit log. System and authentication collections are protected from collection-level changes. Review previews before applying file edits; do not store provider tokens in source files or commit them to Git.
