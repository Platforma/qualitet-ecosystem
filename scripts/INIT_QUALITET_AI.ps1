Write-Host ""
Write-Host "====================================="
Write-Host "QUALITET AI SYSTEM INIT"
Write-Host "====================================="
Write-Host ""

# Foldery Ollama

mkdir ai\ollama -Force | Out-Null
mkdir ai\ollama\prompts -Force | Out-Null
mkdir ai\ollama\outputs -Force | Out-Null
mkdir ai\ollama\history -Force | Out-Null
mkdir ai\ollama\templates -Force | Out-Null

# BACKEND PROMPT

@'
Wygeneruj BACKEND_V2_FINAL.

Po polsku.

Bez kodu.

Technologie:

Node.js
Express.js
MongoDB Atlas
Ollama

Uwzględnij:

- Controllers
- Routes
- Models
- Services
- Middleware
- JWT
- RBAC
- CRM
- Marketplace
- AI Qualitet

Bez duplikatów.
'@ | Set-Content ai\ollama\prompts\BACKEND_PROMPT.md

# DATABASE PROMPT

@'
Wygeneruj DATABASE_V2_FINAL.

Po polsku.

Bez kodu.

Uwzględnij:

- Kolekcje MongoDB
- Indeksy
- Relacje
- Pamięć platformy
- Audit Logs
- Backup

Bez duplikatów.
'@ | Set-Content ai\ollama\prompts\DATABASE_PROMPT.md

# OWNER STUDIO PROMPT

@'
Wygeneruj OWNER_STUDIO_V2_FINAL.

Po polsku.

Bez kodu.

Uwzględnij:

- Dashboard
- CRM
- Firmy
- Sprzedawcy
- AI
- Deploy
- GitHub
- Render
- SEO
- Discord
- Pamięć platformy

Bez duplikatów.
'@ | Set-Content ai\ollama\prompts\OWNER_STUDIO_PROMPT.md

# PLIKI WYNIKOWE

ni ai\ollama\outputs\BACKEND_V2.md -Force | Out-Null
ni ai\ollama\outputs\DATABASE_V2.md -Force | Out-Null
ni ai\ollama\outputs\OWNER_STUDIO_V2.md -Force | Out-Null

# HISTORIA

ni ai\ollama\history\history.log -Force | Out-Null

# SKRYPT OLLAMA

@'
param(
[string]$PromptFile,
[string]$OutputFile,
[string]$Model="phi3"
)

$Prompt = Get-Content $PromptFile -Raw

$Response = $Prompt | ollama run $Model

$Response | Set-Content $OutputFile -Encoding UTF8

Add-Content ai\ollama\history\history.log "

$(Get-Date)

MODEL: $Model

PROMPT: $PromptFile

OUTPUT: $OutputFile

"
'@ | Set-Content scripts\RUN_OLLAMA_PROMPT.ps1

# PIPELINE

@'
.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\BACKEND_PROMPT.md" `
-OutputFile "ai\ollama\outputs\BACKEND_V2.md"

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\DATABASE_PROMPT.md" `
-OutputFile "ai\ollama\outputs\DATABASE_V2.md"

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\OWNER_STUDIO_PROMPT.md" `
-OutputFile "ai\ollama\outputs\OWNER_STUDIO_V2.md"
'@ | Set-Content scripts\RUN_ALL_OLLAMA.ps1

Write-Host ""
Write-Host "✅ QUALITET AI GOTOWE"
Write-Host ""
Write-Host "Uruchom:"
Write-Host ".\scripts\RUN_ALL_OLLAMA.ps1"
Write-Host ""