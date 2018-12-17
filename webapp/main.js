var http = require('http');
var path = require('path');
const express = require('express')
const app = express()
const port = 8080

//point all requests for static resources to the resources folder automatically
app.use(express.static(path.join(__dirname, '/resources')));

app.set('view engine', 'ejs');

// routes
app.get('/', function (req, res) {
  res.render('pages/index', {});
});

app.post('/', function (req, res) {
  // TODO
});

app.listen(port, function () {
   console.log("listening on " + port);
});
