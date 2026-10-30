const http = require("http");

const server = http.createServer((req,res)=>{

res.writeHead(200,{
"Content-Type":"text/html; charset=utf-8"
});

res.end(`
<h1>QUALITET ECOSYSTEM</h1>
<h2>Henryk Command Center</h2>
<p>Status: ONLINE</p>
<p>Project Score: 100/100</p>
`);

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("QUALITET ONLINE");
});
