param(
[string]$Entry="Zmiana projektu"
)

$Date = Get-Date -Format "dd.MM.yyyy HH:mm"

Add-Content `
PROJECT_HISTORY.md `
"

--------------------------------
$Date

$Entry

"

Write-Host "Historia zapisana."
