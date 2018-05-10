const express = require('express');
const passport = require('passport');
const axios = require('axios');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
const router = express.Router();

const User = require('../models/User');

function handleError(err) {
  console.error(err);
  process.exit(1);
}

function findBook(query, callback) {
  axios
    .get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${query}`)
    .then(function(response) {
      // Book data.
      const data = response.data.items[0].volumeInfo;
  
      if (data) {
        const book = {
          title: data.title,
          thumbnail: data.imageLinks ? data.imageLinks.thumbnail : null,
          authors: data.authors,
          publishedDate: data.publishedDate,
          isbn: +data.industryIdentifiers[0].identifier,
        };
        callback(book);
      }
      else {
        callback("Book not found");
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}

// User model.
const Book = require('../models/Book');

/* GET books. */
router.get('/', ensureLoggedIn, function(req, res, next) {
  Book.find(function(err, docs) {
    if (err) {
      return handleError(err);
    }
    else {
      const books = docs;
      const email = req.user._json.email;
      if (email) {
        // Find user and extract full name.
        User.find({ email: email }, function(err, results) {
          if (err) {
            handleError(err);
          }
          const user = results[0];
          res.render('books', { books: books, user: user });
        });
      }
    }
  });
});

/* GET book. */
router.get('/:isbn', ensureLoggedIn, function(req, res) {
  const id = +req.params.isbn;
  const email = req.user._json.email;

  Book.find({ isbn: id }, function(err, results) {
    if (err) {
      return handleError(err);
    }
    const book = results[0];
    if (book) {
      res.render('book', { book: book, user: email })
    }
    else {
      res.redirect('/books')
    }
  })

})

/* POST book trade request. */
router.post('/:isbn/request', ensureLoggedIn, function(req, res, next) {
  // Book ISBN.
  const isbn = +req.params.isbn;
  // User email.
  const currentUserEmail = req.user._json.email;

  if (isbn && currentUserEmail) {
    const query = { isbn: isbn };
    // Add trade request object with isbn, email, city and state to list of trade requests.
    User.find({ email: currentUserEmail }, function(err, results) {
      if (err) {
        throw err;
      }
      const user = results[0];

      const newRequest = {
        isbn: isbn,
        email: currentUserEmail,
        city: user.city,
        state: user.state
      }
      Book.findOneAndUpdate(query, { $push: { requests: newRequest } }, function(err, updatedDoc) {
        if (err) {
          return handleError(err);
        }
        console.log('Added request to list of trade requests.')
        // Add request to list of requests received by book owner.
        const title = updatedDoc.title;
        const currentOwner = updatedDoc.currentOwner;
        // Save request as received request to current owner.
        User.findOneAndUpdate({ email: currentOwner }, { $push: { requestsReceived: Object.assign(newRequest, { title: title }) } }, function(err, updatedDoc) {
          if (err) {
            throw err;
          }
        });
        // Add request to current user's list of sent requests.
        User.findOneAndUpdate({ email: currentUserEmail }, { $push: { requestsSent: Object.assign(newRequest, { title: title }) } }, function(err, updatedDoc) {
          if (err) {
            return handleError(err);
          }
        });
      });
      res.redirect('/user');
    })
  }
  else {
    res.sendStatus(400);
  }
});

/* POST book trade confirmation */
router.post('/:isbn/confirm', ensureLoggedIn, function(req, res) {
  const isbn = +req.params.isbn;
  // Email of requesting user.
  const requestor = req.body.email;
  const currentUserEmail = req.user._json.email;
  if (isbn && requestor) {
    // Search for book by isbn to trade.
    Book.find({ isbn: isbn }, function(err, results) {
      if (err) {
        return handleError(err);
      }
      const book = results[0];
      // Filter requestor from request list.
      const newRequests = book.requests.filter(r => r !== requestor);
      // Change ownership of book.
      // Remove old owner from requests.
      Book.findOneAndUpdate({ _id: book._id }, { $set: { currentOwner: requestor, requests: newRequests } }, function(err, updatedDoc) {
        if (err) {
          return handleError(err);
        }
        console.log('Ownership of ' + isbn + ' has been successfully changed.');
      });
      // Remove request from list of requests received by owner.
      User.find({ email: currentUserEmail }, function(err, results) {
        if (err) {
          throw err;
        }
        const user = results[0];
        const newReceived = user.requestsReceived.filter(r => r.email !== requestor);
        // Update user with new list of received trade requests.
        User.findOneAndUpdate({ email: currentUserEmail }, { requestsReceived: newReceived }, function(err, updatedDoc) {
          if (err) {
            throw err;
          }
          console.log('Received list has been successfully updated.');
          res.redirect('/user');
        })
      });
    })
  }
  else {
    res.redirect('/user');
  }
});

/* POST book. */
router.post('/', ensureLoggedIn, function(req, res, next) {
  const email = req.user._json.email;
  // Get book.
  try {
    findBook(req.body.isbn, response => {
      if (response !== "Book not found") {
        const book = Object.assign(response, { currentOwner: email }, { requests: [] });
        // Save book.
        Book.create(book, function(err, newDoc) {
          if (err) {
            return handleError(err);
          }
          // saved!
          console.log('Book saved.');
        });
        res.redirect('/user');
      }
      else {
        res.redirect('/user');
      }
    });
  }
  catch (err) {
    res.sendStatus(500);
  }
});

/* DELETE book. */
router.post('/:isbn/delete', ensureLoggedIn, function(req, res) {
  // Get ISBN Number.
  const id = +req.params.isbn;
  // Remove book by book id.
  Book.remove({ isbn: id }, function(err) {
    if (err) {
      return handleError(err);
    }
    res.redirect('/user');
  });

});

router.get('/api/clear', function(req, res) {
  Book.remove({}, function(err) {
    if (err) return handleError(err);
    // removed!
    res.redirect('/');
  });

});

module.exports = router;
