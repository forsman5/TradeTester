var http = require('http');

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('zach i have christmas presents for you, do you want them?');
}).listen(8080);
