const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: {type: String, required: true},
    thumbnail: {type: String, required: true},
    authors: {type: Array, required: true},
    publishedDate: {type: String, required: true},
    isbn: {type: Number, required: true},
    currentOwner: {type: String, required: true},
    requests: {type: Array, required: true},
}, {timestamps: true});

module.exports = mongoose.model('Book', BookSchema);