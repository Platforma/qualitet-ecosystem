const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req,res)=>{

    const filePath = path.join(__dirname,"index.html");

    fs.readFile(filePath,"utf8",(err,data)=>{

        if(err){
            res.writeHead(500);
            res.end("Server Error");
            return;
        }

        res.writeHead(200,{
            "Content-Type":"text/html; charset=utf-8"
        });

        res.end(data);
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT,()=>{
    console.log("QUALITET ONLINE");
});
