Clear-Host

Write-Host ""
Write-Host "================================="
Write-Host "QUALITET AUTO COMPLETE V3"
Write-Host "================================="
Write-Host ""

$Issues = @()

function Add-Issue {
    param(
        [string]$Module,
        [string]$Problem
    )

    $script:Issues += [PSCustomObject]@{
        Module  = $Module
        Problem = $Problem
        Status  = "ACTION_REQUIRED"
    }
}

# ======================
# ENV
# ======================

if (!(Test-Path ".env"))
{
    Add-Issue ".ENV" "Brak pliku .env"
}

# ======================
# AI FILES
# ======================

if (!(Test-Path "ai\memory\AGENT_REGISTRY.json"))
{
    Add-Issue "AI" "Brak AGENT_REGISTRY.json"
}

if (!(Test-Path "ai\agents\MEMORY_API.md"))
{
    Add-Issue "MEMORY" "Brak MEMORY_API.md"
}

if (!(Test-Path "ai\agents\AGENT_ROUTER.md"))
{
    Add-Issue "ROUTER" "Brak AGENT_ROUTER.md"
}

if (!(Test-Path "ai\agents\AUTO_COMPLETE_ENGINE.md"))
{
    Add-Issue "AI" "Brak AUTO_COMPLETE_ENGINE.md"
}

if (!(Test-Path "ai\modelfiles\AI_QUALITET.Modelfile"))
{
    Add-Issue "AI" "Brak AI_QUALITET.Modelfile"
}

# ======================
# DASHBOARD
# ======================

if (!(Test-Path "docs\HENRYK_DASHBOARD.md"))
{
    Add-Issue "DASHBOARD" "Brak HENRYK_DASHBOARD.md"
}

# ======================
# DNS
# ======================

$Domains = @(
"qualitet-market.com",
"henryk.qualitet-market.com",
"api.qualitet-market.com",
"owner.qualitet-market.com",
"ai.qualitet-market.com"
)

foreach($Domain in $Domains)
{
    try
    {
        Resolve-DnsName $Domain -ErrorAction Stop | Out-Null
    }
    catch
    {
        Add-Issue "DNS" "Brak DNS dla $Domain"
    }
}

# ======================
# HTTPS
# ======================

$Websites = @(
"https://qualitet-market.com"
)

foreach($Site in $Websites)
{
    try
    {
        Invoke-WebRequest `
        -Uri $Site `
        -Method Head `
        -TimeoutSec 10 | Out-Null
    }
    catch
    {
        Add-Issue "HTTPS" "Brak HTTPS dla $Site"
    }
}

# ======================
# OLLAMA
# ======================

try
{
    ollama list | Out-Null
}
catch
{
    Add-Issue "OLLAMA" "Ollama nie odpowiada"
}

# ======================
# GIT
# ======================

if (!(Test-Path ".git"))
{
    Add-Issue "GIT" "Brak repozytorium Git"
}

# ======================
# RAPORT
# ======================

if ($Issues.Count -eq 0)
{
    Write-Host ""
    Write-Host "BRAK PROBLEMOW"
    Write-Host ""
}
else
{
    Write-Host ""
    Write-Host "WYKRYTO PROBLEMY"
    Write-Host ""

    $Issues | Format-Table -AutoSize

    $Issues |
    Export-Csv `
    docs\AUTO_COMPLETE_REPORT.csv `
    -NoTypeInformation `
    -Encoding UTF8

    Write-Host ""
    Write-Host "Raport zapisany:"
    Write-Host "docs\AUTO_COMPLETE_REPORT.csv"
    Write-Host ""
}

Write-Host ""
Write-Host "================================="
Write-Host "SKAN ZAKONCZONY"
Write-Host "================================="
Write-Host ""