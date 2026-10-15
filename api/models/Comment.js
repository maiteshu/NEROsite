const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const CommentSchema = new Schema ({
    post: {type: Schema.Types.ObjectId, ref: 'Post', required:true},
    author: {type: Schema.Types.ObjectId, ref: 'User', required:true},
    content: {type: String, required:true, maxlength: 1000},
}, {
    timestamps:true,
});

module.exports = model('Comment', CommentSchema);