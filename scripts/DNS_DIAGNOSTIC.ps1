Clear-Host

Write-Host ""
Write-Host "DNS DIAGNOSTIC"
Write-Host ""

$Domains = @(
"qualitet-market.com",
"www.qualitet-market.com",
"henryk.qualitet-market.com",
"api.qualitet-market.com",
"owner.qualitet-market.com",
"ai.qualitet-market.com"
)

foreach($Domain in $Domains)
{
    Write-Host ""
    Write-Host "================================="

    Write-Host $Domain

    Write-Host "================================="

    try
    {
        Resolve-DnsName $Domain

    }
    catch
    {
        Write-Host "BRAK REKORDU"
    }
}