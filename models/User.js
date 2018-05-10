const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {type: String, required: true},
    city: String,
    state: String,
    books: Array,
    requestsSent: {type: Array, required: true},
    requestsReceived: {type: Array, required: true},
}, {timestamps: true});

module.exports = mongoose.model('User', UserSchema);