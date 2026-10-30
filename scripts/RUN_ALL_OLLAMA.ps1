.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\BACKEND_PROMPT.md" `
-OutputFile "ai\ollama\outputs\BACKEND_V2.md"

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\DATABASE_PROMPT.md" `
-OutputFile "ai\ollama\outputs\DATABASE_V2.md"

.\scripts\RUN_OLLAMA_PROMPT.ps1 `
-PromptFile "ai\ollama\prompts\OWNER_STUDIO_PROMPT.md" `
-OutputFile "ai\ollama\outputs\OWNER_STUDIO_V2.md"
