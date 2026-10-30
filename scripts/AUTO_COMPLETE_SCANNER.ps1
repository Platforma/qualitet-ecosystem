Clear-Host

Write-Host ""
Write-Host "================================="
Write-Host "AUTO COMPLETE SCANNER"
Write-Host "================================="
Write-Host ""

$Issues = @()

if (!(Test-Path "ai\memory\AGENT_REGISTRY.json"))
{
    $Issues += "Brak AGENT_REGISTRY.json"
}

if (!(Test-Path "docs\HENRYK_DASHBOARD.md"))
{
    $Issues += "Brak HENRYK_DASHBOARD.md"
}

if ($Issues.Count -eq 0)
{
    Write-Host "✅ BRAK PROBLEMÓW"
}
else
{
    Write-Host ""
    Write-Host "⚠ WYKRYTO PROBLEMY"
    Write-Host ""

    $Issues | ForEach-Object {
        Write-Host $_
    }
}