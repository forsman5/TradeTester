var http = require('http');
var path = require('path');
var request = require('request');
const express = require('express');
const app = express()
const port = 8080

var queries = require('./queries')

// cryptography
var passport = require("passport");
var bcrypt = require("bcrypt");
var Strategy = require('passport-local').Strategy;
const uuidv4 = require('uuid/v4');
const SALT_ROUNDS = 5;

// database
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('../database/tradetester.db');

//point all requests for static resources to the resources folder automatically
app.use(express.static(path.join(__dirname, '/resources')));

app.use(require('cookie-parser')()); // for auth
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'hft', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// passport configuration
passport.use(new Strategy(function(username, password, done) {
  db.get(queries.getAccountByUsername, username, function(err, row) {
    if (!row) return done(null, false);

    if (bcrypt.compareSync(password, row.pass)) {
      return done(null, row);
    } else {
      return done(null, false);
    }
  });
}));

passport.serializeUser(function(user, done) {
  return done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.get(queries.getAccountById, [id], function(err, row) {
    if (err) {
      console.log(err.message);
      return done(null, false);
    }

    if (!row) {
      console.log('user not found');
      return done(null, false);
    }

    return done(null, row);
  });
});

app.set('view engine', 'ejs');

/* UTILITIES */

// returns -1 if not found
// TODO - last price checked cache
// check cache first, if cache miss or result is older than say a minute, query api. then, update cache.
// else return cached value. cache is table of symbol - price - last checked
function getPrice (symbol) {
  var options = { method: 'GET', url: 'https://api.iextrading.com/1.0/stock/' + symbol + '/price'};

  symbol = symbol.toUpperCase();

  var updateCache = function(price) {
    var time = new Date().getTime();

    db.run(queries.insertCachedPrice, [symbol, time, price], function(err) {
      if (err) {
        console.log(err);
      }
    });
  };

  var getNewPrice = function(resolve, reject) {
    request(options, function (error, response, body) {
      if (error) throw new Error(error);

      if (body != "Unknown symbol") {
        var parsed = JSON.parse(body);

        updateCache(body);

        // don't need this to happen in a callback - cachce insert can finish whenever
        resolve(body);
      } else {
        resolve(-1);
      }
    });
  };

  return new Promise(function (resolve,reject) {
    db.get(queries.getCachedPrice, symbol, function(err, row) {
      if (err) {
        console.log(err);
      }

      var t = new Date().getTime();

      if (row) {
        // check if recent enough
        var timeDiff = t - row.time_checked;

        if ((timeDiff / 1000.0 ) < 60.0 ) {
          // use this value
          resolve(row.price);
        } else {
          getNewPrice(resolve, reject);
        }
      } else {
        getNewPrice(resolve, reject);
      }
    });
  });
}

// checks if the given user is the owner of the given competition_id
function isOwner (competitionId, user, failureCB, successCB) {
  db.get(queries.getCompetitionById, [competitionId], function (err, row) {
    if (err) {
      console.log(err.message);
      failureCB();
    }

    if (row.creator_id != user.id) {
      // TODO error message
      // perhaps a parameter?
      failureCB();
    }

    successCB();
  })
}

// TODO return false if this competition end date is before current date
function isActiveCompetitor(competitionId, user, failureCB, successCB) {
  if (!user) {
    failureCB();
    return;
  }

  db.get(queries.getActiveState, [competitionId, user.id], function(err, row) {
    if (err) {
      console.log(err.message + " 4");
      failureCB();
      return;
    }

    if (!row || row.active_state != 1) {
        // TODO error message
        // perhaps a parameter?
        failureCB();
        return;
    }

    successCB(row.capital);
  });
}

async function processPortfolio(portfolio) {
  newPortfolio = [];

  for (var i = 0; i < portfolio.length; i++) {
    var price = await getPrice(portfolio[i].symbol);

    newPortfolio.push({
      symbol: portfolio[i].symbol,
      shares: portfolio[i].shares,
      valuePerShare: price,
      totalValue: price * portfolio[i].shares
    });
  }

  return newPortfolio;
}

/*
 * TODO this will change, to take a callback at the very end
 * used to process any portfolio from ids, not an already given portfolio
 */
function renderTrades(req, res, params) {
  var failureCB = function() {
    res.redirect('/');
    return;
  }

  isActiveCompetitor(req.params.competitionId, req.user, failureCB, function(capital) {
    db.get(queries.getCompetitionById, [req.params.competitionId], function(err, compRow) {
      if (err) {
        console.log(err.message);
        failureCB();
      }

      if (!compRow) failureCB();

      db.all(queries.getPortfolio, [req.params.competitionId, req.user.id], function(err, portfolio) {
        if (err) {
          console.log(err.message);
          failureCB();
        }

        if (!portfolio) failureCB();

        processPortfolio(portfolio).then(function(result) {
          params.user = req.user;
          params.competition = compRow;
          params.capital = capital;
          params.portfolio = result;

          res.render('pages/trade', params);
        });
      });
    });
  });
}

// like the query - negative value to sell, positive quantity to buy
function exchangeStock(competitionId, userId, symbol, price, quantity, capital, failureCB, successCB) {
  db.run(queries.updatePortfolio, { $quantity: quantity, $competition: competitionId, $account: userId, $symbol: symbol}, function(err) {
    if (err) {
      console.log(err.message + '2');
      failureCB('sql error 2');
    }

    db.run(queries.updateCapital, [capital - (quantity * price), competitionId, userId], function(err) {
      if (err) {
        console.log(err.message + '3');
        failureCB('sql error 3');
      }

      successCB();
    });
  });
}

function sellStock(competitionId, userId, symbol, price, quantity, capital, failureCB, successCB) {
  db.all(queries.getPortfolio, [competitionId, userId], function(err, rows) {
    if (err) {
      console.log(err.message + '1');
      failureCB('sql error 1');
    }

    var i = 0;

    // just walk down to where the right symobl is
    while (i < rows.length && rows[i].symbol.toUpperCase() != symbol.toUpperCase()) {
      i ++;
    }

    if (i == rows.length) {
      // failure never found it
      failureCB("that symbol doesn't exist in your portfolio!");
    } else {
      // rows[i] = the portfolio we want
      if (rows[i].shares < quantity) {
        failureCB("you don't have enough shares to sell");
      } else {
        exchangeStock(competitionId, userId, symbol, price, -1 * quantity, capital, failureCB, successCB);
      }
    }
  });
}

function buyStock(competitionId, userId, symbol, price, quantity, capital, failureCB, successCB) {
  if (capital > quantity * price) {
    exchangeStock(competitionId, userId, symbol, price, quantity, capital, failureCB, successCB);
  } else {
    failureCB("you can't afford that!")
  }
}

/* ROUTES */

// gets first

app.get('/', function (req, res) {
  if (req.user) {
    res.redirect('/user');
  } else {
    res.render('pages/index', {
      symbol: null,
      price: null
    });
  }
});

app.get('/newCompetition', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  res.render('pages/newCompetition', {user: req.user});
});

app.get('/user', function(req, res) {
  if (req.user) {
    db.all(queries.getAccountsCompetitions, [req.user.id], function(err, ownedRows) {
      if (err) {
        console.log(err.message);
      }

      db.all (queries.getAllParticipatingCompetitions, [req.user.id], function (err, participatingRows) {
        if (err) {
          console.log(err.message);
        }

        res.render('pages/user', {
          user: req.user,
          ownedCompetitions: ownedRows,
          participantCompetitions: participatingRows
        });
      });
    });
  } else {
    res.redirect('/');
  }
});

app.get('/login', function(req, res) {
  // return the log in page
  req.logout();
  res.render('pages/login', {});
});

app.get('/signup', function(req, res) {
  req.logout();
  res.render('pages/signup', {});
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/competitions/:competitionId', function(req, res) {
  db.get(queries.getCompetitionById, [req.params.competitionId], function(err, row) {
    if (err) {
      console.log(err.message);
    }

    if (!row) {
      // TODO error message
      res.redirect('/');
      return;
    }

    params = {user: req.user, competition: row};

    db.all(queries.getParticipantsOfCompetition, [row.id], function(err, competitorRows) {
      if (err) {
        console.log(err.message);
      }

      if (req.user && row.creator_id == req.user.id) {
        params.allMembers = competitorRows;
      }

      var isCompetitor = false;

      // only active competitors
      params.competitors = competitorRows.filter(function (person) {
        if (req.user && person.id == req.user.id) {
          isCompetitor = true;
        }

        return person.active_state == 1;
      });

      // TODO attach valuation to each competitor

      // TODO sort competitors by highest valuation first

      if (isCompetitor) {
        db.all(queries.getPortfolio, [row.id, req.user.id], function(err, portfolio) {
          if (err) {
            console.log(err.message);
          }

          params.portfolio = portfolio;

          res.render('pages/competition', params);
        })
      } else {
        res.render('pages/competition', params);
      }
    });
  })
});

app.get('/joinCompetition', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  res.render('pages/joinCompetition', {user: req.user});
});

app.get('/competitions/:competitionId/trade', function(req, res) {
  renderTrades(req,res, {});
});

// posts below

app.post('/newCompetition', function (req, res) {
  if (!req.user) {
    res.redirect('/');
  }

  db.run(queries.insertCompetition, [req.user.id, req.body.startDate, req.body.endDate, req.body.startingCapital, req.body.name], function(err) {
    if (err) {
      console.log(err.message);
    }

    res.redirect('/user');
  });
});

app.post('/newApiKey', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  newKey = uuidv4();

  db.run(queries.updateApiKeyOfAccount, [newKey, req.user.id], function(err) {
    if (err) {
      console.log(err.message);
    }

    res.redirect('/user');
  })
});

app.post('/login', function(req, res) {
  if (req.user) {
    res.redirect('/user');
  }

  passport.authenticate('local', function(err, user) {
    if (err) {
      res.render('pages/login', {errorMessage: err.message});
    } else {
      req.logIn(user, function(err) {
        if (err) {
          console.log(err.message);
          res.render('pages/login', {errorMessage: "user does not exist"});
        } else {
          return res.redirect('/');
        }
      });
    }
  })(req, res);
});

app.post('/signup', function(req, res) {
  if (req.user) {
    return;
  }

  // TODO : check if password meets requirements
  if (false) {
    res.render('pages/login', {errorMessage: "Password doesn't meet requirements!"});
  }

  var hash = bcrypt.hashSync(req.body.password, SALT_ROUNDS);

  var api_key = uuidv4();

  db.all(queries.getAccountByUsername, [req.body.username], function(err, rows) {
    if (err) {
      // sql error
      console.log(err.message);
    } else if (rows && rows.length > 0) {
      // this user name is already taken
      res.render('pages/signUp', { errorMessage: 'Username already taken'});
    } else {
      // this is a valid submission, add it

      db.run(queries.insertAccount, [req.body.username, hash, api_key], function(err) {
        if (err) {
          console.log(err.message);
        } else {
          passport.authenticate('local', function(err, user) {
            req.logIn(user, function(err) {
              if (err) {
                console.log(err.message);
              } else {
                return res.redirect('/');
              }
            });
          })(req,res);
        }
      });
    }
  });
});

app.post('/competitions/:competitionId/trade', function (req, res) {
  var failureCB = function(message) {
    renderTrades(req, res, { errorMessage: message });
  }

  isActiveCompetitor(req.body.competition, req.user, function () { res.redirect('/user'); }, function(capital) {
    var promise = async function (sym) {
      return await getPrice(sym);
    }(req.body.symbol);

    promise.then(function(price) {
      if (price == -1) {
        failureCB("That symbol does not exist");
      }

      if (req.body.option == "query") {
        renderTrades(req, res, { symbol: req.body.symbol, price: price });
      } else if (req.body.option == "buy") {
        buyStock(req.body.competition, req.user.id, req.body.symbol.toUpperCase(), price, req.body.quantity, capital, failureCB, function () { renderTrades(req, res, {}); });
      } else if (req.body.option == "sell") {
        sellStock(req.body.competition, req.user.id, req.body.symbol.toUpperCase(), price, req.body.quantity, capital, failureCB, function () { renderTrades(req, res, {}); });
      } else {
        console.log('dangerous attempt detected - post to /competitions/id/trade');
        failureCB('Bad route');
      }
    });
  });
});

// this is for searching for one to join, not actually joining
app.post('/joinCompetition', function(req, res) {
  var query = "";
  if (req.body.method == "username") {
    query = queries.getCompetitionsByUsername;
  } else {
    // compName
    query = queries.getCompetitionsByCompName;
  }

  var param = "%" + req.body.parameter + "%";

  db.all(query, [param, req.user.id], function(err, rows) {
    if (err) {
      console.log(err.message);
      res.redirect('/user');
    }

    res.render('pages/joinCompetition', {user: req.user, results: rows});
  });
});

app.post('/addCompetitor', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  db.get(queries.getCompetitionById, [req.body.competition_id], function(err, row) {
    if (err) {
      console.log(err.message);
    }

    var activeState = 0;

    if (row.creator_id == req.user.id) {
      activeState = 1;
    }

    db.run(queries.insertCompetitionMember, [req.user.id, req.body.competition_id, row.starting_capital, activeState], function(err) {
      if (err) {
        console.log(err.message);
      }

      // TODO change this depending on where its coming from
      // join Competition page should stay there, competition page should return to user page
      res.redirect('/user');
    });
  });
});

app.post('/removeCompetitor', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  queries.deleteCompetitionMember(db, req.body.competition_id, req.user.id, function() { res.redirect('/user'); });
});

app.post('/approveRequest', function(req, res) {
  if (!req.user) {
    res.redirect('/login');
  }

  isOwner(req.body.competition_id, req.user, function() {res.redirect('/user'); }, function() {
    db.run(queries.activateMember, [req.body.competition_id, req.body.user_id], function(err) {
      if (err) {
        console.log(err.message);
      }

      res.redirect('/competitions/' + req.body.competition_id);
    });
  });
});

/*
 * this needs to be separate from remove competitor -
 * you can only remove youreslf. if you are attempting to remove another, need a check to
 * to ensure that you own the competition.
 */
app.post('/denyRequest', function(req, res) {
  // first, check if the request is valid
  if (!req.user) {
    res.redirect('/login');
  }

  isOwner(req.body.competition_id, req.user, function() { res.redirect('/user'); }, function() {
    queries.deleteCompetitionMember(db, req.body.competition_id, req.body.user_id, function() {
      res.redirect('/competitions/' + req.body.competition_id);
    });
  });
});

app.listen(port, function () {
   console.log("listening on " + port);
});
