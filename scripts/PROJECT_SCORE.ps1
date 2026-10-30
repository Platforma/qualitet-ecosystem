Clear-Host

$Score = 100

$Checks = @(
".env",
"ai\memory\AGENT_REGISTRY.json",
"ai\agents\MEMORY_API.md",
"ai\agents\AGENT_ROUTER.md",
"ai\modelfiles\AI_QUALITET.Modelfile",
"docs\HENRYK_DASHBOARD.md"
)

foreach($Check in $Checks)
{
    if(!(Test-Path $Check))
    {
        $Score -= 10
    }
}

Write-Host ""
Write-Host "====================="
Write-Host "PROJECT SCORE"
Write-Host "====================="
Write-Host ""

Write-Host "$Score / 100"

Write-Host ""