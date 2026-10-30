[CmdletBinding()]
param(
    [switch]$IncludeUntracked
)

$ErrorActionPreference = "Stop"

try {
    $repoRoot = & git -C $PSScriptRoot rev-parse --show-toplevel
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
        throw "Nie mozna ustalic katalogu repozytorium Git."
    }

    Set-Location -LiteralPath $repoRoot

    $branch = & git branch --show-current
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
        throw "Nie mozna ustalic aktywnej galezi Git."
    }

    & git remote get-url origin *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Nie skonfigurowano zdalnego repozytorium 'origin'."
    }

    & git diff --cached --quiet
    $stagedChangesExitCode = $LASTEXITCODE
    if ($stagedChangesExitCode -eq 1) {
        throw "Indeks zawiera juz staged changes. Najpierw wykonaj ich commit albo unstage."
    }
    if ($stagedChangesExitCode -ne 0) {
        throw "Nie udalo sie sprawdzic staged changes."
    }

    if ($IncludeUntracked) {
        & git add -A -- .
    }
    else {
        & git add -u -- .
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Nie udalo sie dodac zmian do indeksu Git."
    }

    & git diff --cached --quiet
    $stagedChangesExitCode = $LASTEXITCODE
    if ($stagedChangesExitCode -eq 0) {
        Write-Host "Brak zmian do zapisania i wypchniecia."
        exit 0
    }
    if ($stagedChangesExitCode -ne 1) {
        throw "Nie udalo sie sprawdzic zmian przygotowanych do commitu."
    }

    $date = Get-Date -Format "yyyy-MM-dd HH:mm"
    & git commit -m "AUTO SAVE $date"
    if ($LASTEXITCODE -ne 0) {
        throw "Commit nie powiodl sie."
    }

    & git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        throw "Push nie powiodl sie. Commit pozostaje lokalnie na galezi '$branch'."
    }

    Write-Host "Wypchnieto zmiany na origin/$branch."
}
catch {
    Write-Error $_
    exit 1
}
