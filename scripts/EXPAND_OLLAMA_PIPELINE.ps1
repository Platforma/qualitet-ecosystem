mkdir ai\ollama\prompts -Force | Out-Null

@'
Wygeneruj MONGODB_MODELS_V1.

Po polsku.

Bez kodu.

Uwzględnij:

users
companies
products
categories
stores
leads
campaigns
subscriptions
payments
owner_memory
project_memory
user_memory
company_memory
ai_memory
audit_logs

Opis pól.
Opis indeksów.
Opis relacji.
'@ | Set-Content ai\ollama\prompts\MONGODB_MODELS_PROMPT.md

@'
Wygeneruj API_V1.

Po polsku.

Bez kodu.

Uwzględnij:

Auth API
CRM API
Marketplace API
Owner Studio API
Discord API
SEO API
AI API
Trend API
'@ | Set-Content ai\ollama\prompts\API_PROMPT.md

@'
Wygeneruj AUTH_V1.

Po polsku.

Bez kodu.

Uwzględnij:

JWT
Refresh Token
RBAC
2FA

Role:

Owner
Admin
Firma
Sprzedawca
Starter
'@ | Set-Content ai\ollama\prompts\AUTH_PROMPT.md

@'
Wygeneruj FRONTEND_STRUCTURE_V1.

Po polsku.

Bez kodu.

Next.js 15

Owner Studio
Marketplace
CRM
Dashboard Firmy
Dashboard Reklamodawcy
AI Qualitet
'@ | Set-Content ai\ollama\prompts\FRONTEND_STRUCTURE_PROMPT.md

@'
Wygeneruj OWNER_UI_V1.

Po polsku.

Bez kodu.

Dashboard
Firmy
CRM
Marketplace
AI
Deploy
GitHub
SEO
Discord
Backup Center
Diff Editor
'@ | Set-Content ai\ollama\prompts\OWNER_UI_PROMPT.md

Write-Host ""
Write-Host "✅ PROMPTY ROZSZERZONE"
Write-Host ""
Get-ChildItem ai\ollama\prompts