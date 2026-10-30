const http = require("http");

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
        <h1>QUALITET ECOSYSTEM</h1>
        <p>Henryk Command Center</p>
        <p>Platform Status: ONLINE</p>
    `);

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server started on port", PORT);
});
