var http = require('http');
var path = require('path');
var request = require('request');
var secrets = require("./secrets");
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
function getPrice (symbol, callback) {
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

    if (!("Error Message" in parsed)) {
      var lastRefreshed = parsed["Meta Data"]["3. Last Refreshed"];

      callback(parsed["Time Series (1min)"][lastRefreshed]["4. close"]);
    } else {
      callback(-1);
    }
  });
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

    params = {user: req.user, competition: row};

    db.all(queries.getParticipantsOfCompetition, [row.id], function(err, competitorRows) {
      if (err) {
        console.log(err.message);
      }

      if (row.creator_id == req.user.id) {
        params.allMembers = competitorRows;
      }

      var isCompetitor = false;

      // only active competitors
      params.competitors = competitorRows.filter(function (person) {
        if (person.id == req.user.id) {
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

app.post('/', function (req, res) {
  getPrice(req.body.symbol, function(price) {
    sym = req.body.symbol;
    if (price == -1) {
      sym = null;
    }

    res.render('pages/index', {
      symbol: sym,
      price: price,
      user: req.user
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
  db.get(queries.getCompetitionById, [req.body.competition_id], function(err, row) {
    if (err) {
      console.log(err.message);
    }

    db.run(queries.insertCompetitionMember, [req.user.id, req.body.competition_id, row.starting_capital, 0], function(err) {
      if (err) {
        console.log(err);
      }

      // TODO change this depending on where its coming from
      // join Competition page should stay there, competition page should return to user page
      res.redirect('/user');
    });
  });
});

app.post('/removeCompetitor', function(req, res) {
  db.run(queries.deleteCompetitionMember, [req.body.competition_id, req.user.id], function(err) {
    if (err) {
      console.log(err);
    }

    res.redirect('/user');
  });
});

app.listen(port, function () {
   console.log("listening on " + port);
});
