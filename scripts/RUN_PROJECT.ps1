Clear-Host

Write-Host ""
Write-Host "================================="
Write-Host "QUALITET GENERATOR"
Write-Host "================================="
Write-Host ""

# BACKEND

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\BACKEND_PROMPT.md" `
-OutputFile "ai\ollama\outputs\BACKEND_V2.md"

# DATABASE

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\DATABASE_PROMPT.md" `
-OutputFile "ai\ollama\outputs\DATABASE_V2.md"

# OWNER STUDIO

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\OWNER_STUDIO_PROMPT.md" `
-OutputFile "ai\ollama\outputs\OWNER_STUDIO_V2.md"

# MONGODB MODELS

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\MONGODB_MODELS_PROMPT.md" `
-OutputFile "ai\ollama\outputs\MONGODB_MODELS_V1.md"

# API

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\API_PROMPT.md" `
-OutputFile "ai\ollama\outputs\API_V1.md"

# AUTH

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\AUTH_PROMPT.md" `
-OutputFile "ai\ollama\outputs\AUTH_V1.md"

# FRONTEND STRUCTURE

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\FRONTEND_STRUCTURE_PROMPT.md" `
-OutputFile "ai\ollama\outputs\FRONTEND_STRUCTURE_V1.md"

# OWNER UI

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\OWNER_UI_PROMPT.md" `
-OutputFile "ai\ollama\outputs\OWNER_UI_V1.md"

Write-Host ""
Write-Host "================================="
Write-Host "GENEROWANIE ZAKOŃCZONE"
Write-Host "================================="
Write-Host ""

Write-Host "Pliki wygenerowane:"
Write-Host ""

Get-ChildItem ai\ollama\outputs\*.md |

Select-Object Name,Length,LastWriteTime

Write-Host ""
Write-Host "✅ GOTOWE"
Write-Host ""