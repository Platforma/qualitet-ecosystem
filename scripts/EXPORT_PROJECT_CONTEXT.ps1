Clear-Host

Write-Host ""
Write-Host "================================="
Write-Host "QUALITET EXPORT CONTEXT"
Write-Host "================================="
Write-Host ""

$OutputFile = "ai\memory\PROJECT_EXPORT.md"

"# QUALITET ECOSYSTEM EXPORT" | Set-Content $OutputFile

$Files = @(
    "ai\memory\MASTER_CONTEXT.md",
    "ai\memory\PROJECT_CONTEXT.md",
    "ai\memory\PROJECT_RULES.md",
    "ai\memory\PROJECT_HISTORY.md"
)

foreach ($File in $Files) {

    if (Test-Path $File) {

        Add-Content $OutputFile ""
        Add-Content $OutputFile "-----------------------------------"
        Add-Content $OutputFile "ZRODLO: $File"
        Add-Content $OutputFile "-----------------------------------"
        Add-Content $OutputFile ""

        Get-Content $File | Add-Content $OutputFile

    }

}

Write-Host ""
Write-Host "UTWORZONO:"
Write-Host $OutputFile
Write-Host ""