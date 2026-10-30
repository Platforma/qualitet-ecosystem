const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

function readJson(file) {
    try {
        return JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", file),
                "utf8"
            )
        );
    } catch {
        return {};
    }
}

const server = http.createServer((req, res) => {

    const score = readJson("project-score.json");
    const health = readJson("system-health.json");
    const status = readJson("system-status.json");
    const alerts = readJson("alerts.json");
    const ai = readJson("ai-status.json");

    const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Henryk Command Center</title>

<style>

body{
    margin:0;
    padding:0;
    background:#0f172a;
    color:white;
    font-family:Segoe UI;
}

.header{
    background:#111827;
    padding:20px;
    font-size:32px;
    font-weight:bold;
}

.grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
    gap:20px;
    padding:20px;
}

.card{
    background:#1e293b;
    border-radius:12px;
    padding:20px;
}

.card h2{
    color:#38bdf8;
}

.ok{
    color:#22c55e;
}

</style>
</head>

<body>

<div class="header">
👑 HENRYK COMMAND CENTER
</div>

<div class="grid">

<div class="card">
<h2>PROJECT SCORE</h2>
<h1>${score.score || 0}/100</h1>
</div>

<div class="card">
<h2>SYSTEM STATUS</h2>
<p>Status: ${status.status || "ONLINE"}</p>
<p>Environment: ${status.environment || "PRODUCTION"}</p>
<p>Version: ${status.version || "1.0.0"}</p>
</div>

<div class="card">
<h2>SYSTEM HEALTH</h2>

<p class="ok">Cloudflare: ${health.cloudflare ? "OK" : "FAIL"}</p>
<p class="ok">MongoDB: ${health.mongodb ? "OK" : "FAIL"}</p>
<p class="ok">Ollama: ${health.ollama ? "OK" : "FAIL"}</p>
<p class="ok">Render: ${health.render ? "OK" : "FAIL"}</p>
<p class="ok">Git: ${health.git ? "OK" : "FAIL"}</p>
<p class="ok">DNS: ${health.dns ? "OK" : "FAIL"}</p>

</div>

<div class="card">
<h2>AI CENTER</h2>

<p>AI_QUALITET: ${ai.AI_QUALITET?.status || "OFFLINE"}</p>
<p>AI_DEVELOPER: ${ai.AI_DEVELOPER?.status || "OFFLINE"}</p>
<p>AI_GRAFIK_SZEF: ${ai.AI_GRAFIK_SZEF?.status || "OFFLINE"}</p>
<p>AI_MARKETING: ${ai.AI_MARKETING?.status || "OFFLINE"}</p>
<p>AI_SEO: ${ai.AI_SEO?.status || "OFFLINE"}</p>

</div>

<div class="card">
<h2>ALERT CENTER</h2>

<p>Liczba alertów: ${alerts.alerts?.length || 0}</p>

</div>

<div class="card">
<h2>MEMORY CENTER</h2>

<p>henryk_memory</p>
<p>project_memory</p>
<p>alert_memory</p>
<p>world_memory</p>

</div>

<div class="card">
<h2>INTEGRATIONS</h2>

<p>Cloudflare</p>
<p>MongoDB</p>
<p>Render</p>
<p>GitHub</p>
<p>Discord</p>

</div>

<div class="card">
<h2>AUTO UZUPEŁNIJ</h2>

<p>Gotowy do integracji ze skanerem.</p>

</div>

</div>

</body>
</html>
`;

    res.writeHead(200,{
        "Content-Type":"text/html; charset=utf-8"
    });

    res.end(html);
});

server.listen(PORT,()=>{
    console.log("Henryk Command Center ONLINE");
});