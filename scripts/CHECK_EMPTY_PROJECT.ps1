Clear-Host

Write-Host ""
Write-Host "====================================="
Write-Host "QUALITET EMPTY FILE SCAN"
Write-Host "====================================="
Write-Host ""

$EmptyFiles = Get-ChildItem . -Recurse -File |
Where-Object Length -eq 0

$EmptyFiles |
Select-Object FullName,Length |
Format-Table -AutoSize

$EmptyFiles |
Select-Object FullName,Length |
Export-Csv `
docs\EMPTY_FILES_REPORT.csv `
-NoTypeInformation `
-Encoding UTF8

Write-Host ""
Write-Host "Raport:"
Write-Host "docs\EMPTY_FILES_REPORT.csv"
Write-Host ""

Write-Host "Liczba pustych plików:"
Write-Host $EmptyFiles.Count
Write-Host ""