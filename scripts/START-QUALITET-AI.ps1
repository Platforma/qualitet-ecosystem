Clear-Host

Write-Host ""
Write-Host "QUALITET AI MEMORY"
Write-Host ""

$Prompt  = Get-Content .\OLLAMA_MASTER_PROMPT.txt -Raw
$Context = Get-Content .\PROJECT_CONTEXT.md -Raw
$Rules   = Get-Content .\PROJECT_RULES.md -Raw
$History = Get-Content .\PROJECT_HISTORY.md -Raw

$All = @"

$Prompt

================================================
PROJECT CONTEXT
================================================

$Context

================================================
PROJECT RULES
================================================

$Rules

================================================
PROJECT HISTORY
================================================

$History

"@

$All | Set-Content AI_CONTEXT.txt

Write-Host ""
Write-Host "AI_CONTEXT.txt utworzony"
Write-Host ""
Write-Host "Skopiuj AI_CONTEXT.txt do Ollamy"
Write-Host ""

notepad AI_CONTEXT.txt
