Clear-Host

Write-Host ""
Write-Host "====================================="
Write-Host "QUALITET SYSTEM CHECK"
Write-Host "====================================="
Write-Host ""

# OLLAMA

Write-Host "OLLAMA:"
try {
    ollama list
}
catch {
    Write-Host "❌ Ollama nie działa"
}

Write-Host ""
Write-Host "====================================="
Write-Host ""

# PROMPTY

$Prompts = @(
"ai\ollama\prompts\BACKEND_PROMPT.md",
"ai\ollama\prompts\DATABASE_PROMPT.md",
"ai\ollama\prompts\OWNER_STUDIO_PROMPT.md"
)

foreach($Prompt in $Prompts){

    if(Test-Path $Prompt){

        Write-Host "✅ $Prompt"

    } else {

        Write-Host "❌ BRAK $Prompt"

    }

}

Write-Host ""
Write-Host "====================================="
Write-Host ""

# SKRYPTY

$Scripts = @(
"scripts\RUN_OLLAMA_PROMPT.ps1",
"scripts\RUN_PROJECT.ps1",
"scripts\RUN_ALL_OLLAMA.ps1"
)

foreach($Script in $Scripts){

    if(Test-Path $Script){

        Write-Host "✅ $Script"

    } else {

        Write-Host "❌ BRAK $Script"

    }

}

Write-Host ""
Write-Host "====================================="
Write-Host ""

# OUTPUTS

$Outputs = @(
"ai\ollama\outputs"
)

foreach($Output in $Outputs){

    if(Test-Path $Output){

        Write-Host "✅ $Output"

    } else {

        Write-Host "❌ BRAK $Output"

    }

}

Write-Host ""
Write-Host "====================================="
Write-Host ""

# GITHUB

if(Test-Path ".github\workflows\build.yml"){
    Write-Host "✅ build.yml"
}else{
    Write-Host "❌ build.yml"
}

if(Test-Path ".github\workflows\deploy.yml"){
    Write-Host "✅ deploy.yml"
}else{
    Write-Host "❌ deploy.yml"
}

Write-Host ""
Write-Host "====================================="
Write-Host ""

# BACKEND

if(Test-Path "backend"){
    Write-Host "✅ backend"
}else{
    Write-Host "❌ backend"
}

# RAPORT

Write-Host ""
Write-Host "====================================="
Write-Host "KONTROLA ZAKOŃCZONA"
Write-Host "====================================="
Write-Host ""