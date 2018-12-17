var http = require('http');
var path = require('path');
var request = require('request');
var secrets = require("./secrets");
const express = require('express');
const bodyParser = require("body-parser");
const app = express()
const port = 8080

//point all requests for static resources to the resources folder automatically
app.use(express.static(path.join(__dirname, '/resources')));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

// returns -1 if not found
function getPrice (symbol, callback) {
  console.log(symbol)

  var options = { method: 'GET',
    url: 'https://www.alphavantage.co/query',
    qs:
     { function: 'TIME_SERIES_INTRADAY',
       symbol: symbol,
       interval: '1min',
       apikey: secrets.API_KEY },
    headers: { 'cache-control': 'no-cache' } };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    var parsed = JSON.parse(body);

    var lastRefreshed = parsed["Meta Data"]["3. Last Refreshed"];

    callback(parsed["Time Series (1min)"][lastRefreshed]["4. close"]);
  });
}

// routes
app.get('/', function (req, res) {
  res.render('pages/index', {
    symbol: null,
    price: null
  });
});

app.post('/', function (req, res) {
  getPrice(req.body.symbol, function(price) {
    res.render('pages/index', {
      symbol: req.body.symbol,
      price: price
    });
  });
});

app.listen(port, function () {
   console.log("listening on " + port);
});
