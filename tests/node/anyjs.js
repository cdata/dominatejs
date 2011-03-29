var http = require('http');


var port = process.argv[2];

http.createServer(function (req, res) {

      res.writeHead(200, {'Content-Type': 'application/javascript'});
      res.end('console.log("JS exec @ ' +req.url+ '");');

}).listen(port);

console.log('Server running on port ' + port);
