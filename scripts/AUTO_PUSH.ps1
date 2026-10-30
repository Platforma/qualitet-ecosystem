Clear-Host

Write-Host ""
Write-Host "QUALITET AUTO PUSH"
Write-Host ""

git add .

$Date = Get-Date -Format "yyyy-MM-dd HH:mm"

git commit -m "AUTO SAVE $Date"

git push origin main

Write-Host ""
Write-Host "WYPCHNIETE"
Write-Host ""
