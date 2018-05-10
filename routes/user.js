const express = require('express');
const passport = require('passport');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
const router = express.Router();

// User model.
const User = require('../models/User');
const Book = require('../models/Book');

function handleError(err) {
  console.error(err);
  process.exit(1);
}

/* GET user profile. */
router.get('/', ensureLoggedIn, function(req, res, next) {
  const email = req.user._json.email;
  User.find({ email: email }, function(err, docs) {
    if (err) {
      throw err;
    }
    else {
      const user = docs[0];
      if (user) {
        // Get user's books.
        Book.find({ currentOwner: email }, function(err, books) {
          if (err) {
            throw err;
          }
          const userData = Object.assign(req.user, { city: user.city }, { state: user.state }, { email: user.email }, { requestsSent: user.requestsSent }, { requestsReceived: user.requestsReceived }, { books: books });
        
          res.render('user', {
            user: userData,
          });
        })
      }
      else {
        res.redirect('/login')
      }
    }
  });
});

router.post('/update', ensureLoggedIn, function(req, res, next) {
  var query = { email: req.user._json.email };
  const city = req.body.city;
  const state = req.body.state;
  User.findOneAndUpdate(query, { $set: { city: city, state: state } }, function(err, updatedDoc) {
    if (err) {
      throw err;
    }
    console.log('User has been successfully updated')
  })
  res.redirect('/user');
});

// Removes all users.
router.get('/api/clear', function(req, res) {
  User.remove({}, function(err) {
    if (err) return handleError(err);
    // removed!
    res.redirect('/');
  });
})

module.exports = router;