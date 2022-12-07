const http = require("http");
const fs = require("fs");
const formiadble = require("formidable");

http
  .createServer((req, res) => {
    const { method, url } = req;
    console.log(method, url);
    if (method === "GET" && url === "/") {
      res.writeHead(200, {
        "content-type": "text/html",
      });
      return fs.createReadStream("index.html").pipe(res);
    }
    if (method === "POST" && url === "/upload") {
      // try to make some error
      // if (Math.random() < 0.5) {
      //   res.statusCode = 500;
      //   return res.end("Internal Server Error");
      // }
      return formiadble({
        uploadDir: "./upload",
      }).parse(req, (err, fields, files) => {
        res.writeHead(200, {
          "content-type": "application/json",
        });
        res.end(JSON.stringify({ fields, files }));
      });
    }
    if (method === "GET" && url === "/uploader") {
      res.writeHead(200, {
        "content-type": "application/javascript",
        "cache-control": "no-store",
      });
      return fs.createReadStream("../dist/index.js").pipe(res);
    }
    if (method === "GET" && url === "/request") {
      res.writeHead(200, {
        "content-type": "application/javascript",
        "cache-control": "no-store",
      });
      return fs.createReadStream("../dist/request.js").pipe(res);
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(8888);
