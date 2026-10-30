Write-Host ""
Write-Host "====================================="
Write-Host "QUALITET OLLAMA FIX"
Write-Host "====================================="
Write-Host ""

# Foldery

mkdir ai\ollama\outputs -Force | Out-Null
mkdir ai\ollama\history -Force | Out-Null

# Napraw RUN_OLLAMA_PROMPT

@'
param(
    [string]$PromptFile,
    [string]$OutputFile,
    [string]$Model = "phi3"
)

if (!(Test-Path $PromptFile)) {

    Write-Host "Brak promptu:"
    Write-Host $PromptFile
    exit

}

$Prompt = Get-Content $PromptFile -Raw

Write-Host ""
Write-Host "Model:"
Write-Host $Model

Write-Host ""
Write-Host "Generowanie..."
Write-Host ""

$tempFile = Join-Path $env:TEMP "ollama_output.txt"

cmd /c "type `"$PromptFile`" | ollama run $Model > `"$tempFile`""

Get-Content $tempFile |
Set-Content $OutputFile -Encoding UTF8

Add-Content `
"ai\ollama\history\history.log" `
"$(Get-Date) | $PromptFile -> $OutputFile"

Write-Host ""
Write-Host "✅ Zapisano:"
Write-Host $OutputFile
Write-Host ""
'@ | Set-Content scripts\RUN_OLLAMA_PROMPT.ps1

Write-Host ""
Write-Host "✅ Naprawiono RUN_OLLAMA_PROMPT.ps1"
Write-Host ""