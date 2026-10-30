Clear-Host

Write-Host ""
Write-Host "==================================="
Write-Host "QUALITET KNOWLEDGE BASE"
Write-Host "==================================="
Write-Host ""

$KnowledgeFiles = @(
"ai\knowledge\COMPANY_RULES.md",
"ai\knowledge\CRM_RULES.md",
"ai\knowledge\MARKETPLACE_RULES.md",
"ai\knowledge\MARKETING_RULES.md",
"ai\knowledge\SEO_RULES.md"
)

foreach($File in $KnowledgeFiles)
{
    if((Get-Item $File -ErrorAction SilentlyContinue).Length -eq 0)
    {
@"
# $(Split-Path $File -Leaf)

Status: ACTIVE

Cel:

TODO

Zasady:

TODO

Proces:

TODO

Integracje:

TODO

Memory:

TODO
"@ | Set-Content $File -Encoding UTF8

        Write-Host "✅ Uzupelniono: $File"
    }
}

Write-Host ""
Write-Host "KNOWLEDGE BASE READY"
Write-Host ""
