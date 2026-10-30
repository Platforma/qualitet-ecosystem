Clear-Host

$Score = 100

$html = @"

<html>
<head>
<title>Henryk Dashboard</title>

<style>

body{
    font-family:Segoe UI;
    background:#111;
    color:white;
    padding:30px;
}

.card{
    background:#1b1b1b;
    padding:20px;
    margin-bottom:15px;
    border-radius:10px;
}

.score{
    font-size:50px;
    font-weight:bold;
    color:#00ff88;
}

</style>

</head>

<body>

<h1>HENRYK COMMAND CENTER</h1>

<div class='card'>
<h2>PROJECT SCORE</h2>
<div class='score'>$Score / 100</div>
</div>

<div class='card'>
<h2>Platform Status</h2>

✅ Cloudflare<br>
✅ MongoDB<br>
✅ Ollama<br>
✅ Git<br>
✅ DNS<br>

</div>

<div class='card'>
<h2>AI Center</h2>

AI_QUALITET<br>
AI_DEVELOPER<br>
AI_GRAFIK_SZEF<br>

</div>

<div class='card'>
<h2>Auto Complete</h2>

Brak problemów.

</div>

</body>
</html>

"@

$html |
Set-Content `
docs\dashboard.html `
-Encoding UTF8

Invoke-Item docs\dashboard.html