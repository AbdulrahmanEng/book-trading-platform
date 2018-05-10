const express = require('express');
const passport = require('passport');
const router = express.Router();

const User = require('../models/User');

const env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/login', passport.authenticate('auth0', {
    clientID: env.AUTH0_CLIENT_ID,
    domain: env.AUTH0_DOMAIN,
    redirectUri: env.AUTH0_CALLBACK_URL,
    responseType: 'code',
    audience: 'https://' + env.AUTH0_DOMAIN + '/userinfo',
    scope: 'openid profile email'
  }),
  function(req, res) {
    res.redirect("/");
  });

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/failure'
  }),
  function(req, res) {
    // Save user if not in database.
    const email = req.user._json.email;
    if (email) {
      User.findOne({ email: email }, function(err, user) {
        if (err) {
          throw err;
        }
        // If email is not present save user.
        if (user === null) {
          const user = {
            email: email,
            city: '',
            state: '',
            books: [],
            tradeRequests: [],
            acceptedTradeRequests: []
          };
          User.create(user, function(err, newUser) {
            if (err) {
              throw err;
            }
            else {
              res.redirect(req.session.returnTo || '/user');
            }
          });
        }
        else {

          res.redirect(req.session.returnTo || '/user');
        }
      });
    }
    else {
      res.redirect(req.session.returnTo || '/user');
    }
  }
);

router.get('/failure', function(req, res) {
  var error = req.flash("error");
  var error_description = req.flash("error_description");
  req.logout();
  res.render('failure', {
    error: error[0],
    error_description: error_description[0],
  });
});

module.exports = router;
