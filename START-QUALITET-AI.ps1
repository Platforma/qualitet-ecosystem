Clear-Host

Write-Host ""
Write-Host "================================="
Write-Host "QUALITET AI LOADER"
Write-Host "================================="
Write-Host ""

if (Test-Path ".\OLLAMA_MASTER_PROMPT.txt") {

    Write-Host "✅ MASTER PROMPT znaleziony"

} else {

    Write-Host "❌ Brak OLLAMA_MASTER_PROMPT.txt"
    exit

}

Write-Host ""

Write-Host "Dostępne modele:"
ollama list

Write-Host ""

ollama run phi3