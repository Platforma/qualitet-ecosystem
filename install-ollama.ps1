Write-Host "QUALITET OLLAMA SETUP"

ollama list

Write-Host ""
Write-Host "Test modelu phi3"

ollama run phi3 "Napisz krótki opis Qualitet Market"