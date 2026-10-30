const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req,res)=>{

res.writeHead(200,{
"Content-Type":"text/html; charset=utf-8"
});

res.end(`
<!DOCTYPE html>
<html lang="pl">

<head>

<meta charset="UTF-8">

<title>Henryk Command Center</title>

<style>

body{
margin:0;
font-family:Segoe UI;
background:#0f172a;
color:white;
}

.header{
background:#111827;
padding:20px;
font-size:32px;
font-weight:bold;
}

.menu{
background:#1e293b;
padding:15px;
display:flex;
gap:10px;
flex-wrap:wrap;
}

button{
padding:10px 15px;
border:none;
border-radius:8px;
cursor:pointer;
background:#2563eb;
color:white;
}

.section{
display:none;
padding:20px;
}

.active{
display:block;
}

.card{
background:#1e293b;
padding:20px;
border-radius:12px;
margin-bottom:20px;
}

</style>

</head>

<body>

<div class="header">

👑 HENRYK COMMAND CENTER

</div>

<div class="menu">

<button onclick="showPage('dashboard')">
Dashboard
</button>

<button onclick="showPage('ai')">
AI Center
</button>

<button onclick="showPage('alerts')">
Alert Center
</button>

<button onclick="showPage('memory')">
Memory
</button>

<button onclick="showPage('business')">
Business
</button>

<button onclick="showPage('world')">
World
</button>

<button onclick="showPage('integrations')">
Integrations
</button>

</div>

<div id="dashboard" class="section active">

<div class="card">
<h2>PROJECT SCORE</h2>
<h1>100 / 100</h1>
</div>

<div class="card">
<h2>SYSTEM STATUS</h2>
ONLINE
</div>

</div>

<div id="ai" class="section">

<div class="card">
<h2>AI CENTER</h2>

AI_QUALITET ONLINE<br>
AI_DEVELOPER ONLINE<br>
AI_GRAFIK_SZEF ONLINE<br>
AI_MARKETING ONLINE<br>
AI_SEO ONLINE

</div>

</div>

<div id="alerts" class="section">

<div class="card">
<h2>ALERT CENTER</h2>

Brak alertów

</div>

</div>

<div id="memory" class="section">

<div class="card">
<h2>MEMORY CENTER</h2>

henryk_memory<br>
project_memory<br>
alert_memory<br>
world_memory

</div>

</div>

<div id="business" class="section">

<div class="card">
<h2>BUSINESS CENTER</h2>

Przychód dziś: 0 zł<br>
Przychód miesiąca: 0 zł<br>
Użytkownicy: 1<br>
Firmy: 1

</div>

</div>

<div id="world" class="section">

<div class="card">
<h2>WORLD INTELLIGENCE</h2>

AI ACTIVE<br>
E-COMMERCE ACTIVE<br>
POLSKA ACTIVE<br>
EUROPA ACTIVE

</div>

</div>

<div id="integrations" class="section">

<div class="card">
<h2>INTEGRATIONS</h2>

Cloudflare<br>
MongoDB<br>
Render<br>
GitHub<br>
Discord

</div>

</div>

<script>

function showPage(id){

document.querySelectorAll('.section').forEach(section=>{
section.classList.remove('active');
});

document.getElementById(id).classList.add('active');

}

</script>

</body>

</html>
`);

});

server.listen(PORT,()=>{
console.log("Henryk Command Center V4 ONLINE");
});