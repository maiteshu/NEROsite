require('dotenv').config();

const secret = process.env.JWT_SECRET;
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};
const express = require('express');
const cors = require('cors');
const User = require('./models/User');
const mongoose = require("mongoose");
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const imageUpload = multer({
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only PNG, JPG, WEBP or GIF images are allowed!'));
    },
});
const fs = require('fs');
const Comment = require('./models/Comment');
const path = require('path');

const salt = bcrypt.genSaltSync(10);

const POSTS_PER_PAGE = 10

function saveWithExt(file) {
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const newPath = `${file.path}.${ext}`.replace(/\\/g, '/');
    fs.renameSync(file.path, newpath);
    return newPath;
}

app.set('trust proxy', 1);
app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Mongo connected!'))
    .catch((err) => console.error('Mongo error:', err.message));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const UserDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password, salt),
        });
        res.json(UserDoc);       
    } catch (e) {
        res.status(400).json(e);
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    if (!userDoc) {
        return res.status(400).json('Wrong credentials!');
    }
    const passOK = bcrypt.compareSync(password, userDoc.password);
    if (passOK) {
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
            if (err) throw err;
         res.cookie('token', token, cookieOptions).json({
             id: userDoc._id,
             username,
             avatar: userDoc.avatar || null,
             });
        });
    } else {
        res.status(400).json('Wrong credentials!');
    }
});

app.get('/profile', (req, res) => {
       const { token } = req.cookies;
       jwt.verify(token, secret, {}, async (err, info) => {
           if (err) return res.status(400).json({ error: 'Invalid token' });
           const user = await User.findById(info.id);
           res.json({ id: info.id, username: info.username, avatar: user?.avatar || null });
       });
   });

app.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions).json('ok');
});

app.post('/post', imageUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json('A cover image is required');

    jwt.verify(req.cookies.token, secret, {}, async (err, info) => {
        if (err) {
            fs.unlink(req.file.path, () => {});
            return res.status(401).json('You must be logged in');
        }
        try {
            const cover = saveWithExt(req.file);
            const { title, summary, content } = req.body;
            const postDoc = await Post.create({ title, summary, content, cover, author: info.id });
            res.json(postDoc);
        } catch (e) {
            console.error('POST /post error:', e);
            res.status(500).json({ error: e.message });
        }
    });
});

app.put('/post', imageUpload.single('file'), (req, res) => {
    jwt.verify(req.cookies.token, secret, {}, async (err, info) => {
        if (err) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(401).json('You must be logged in');
        }
        try {
            const { id, title, summary, content } = req.body;
            const postDoc = await Post.findById(id);

            if (!postDoc) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(404).json('Post not found');
            }
            if (String(postDoc.author) !== String(info.id)) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(403).json('You are not the author of this post!');
            }

            // only touch the disk once we know the edit is allowed
            if (req.file) {
                const oldCover = postDoc.cover;
                postDoc.cover = saveWithExt(req.file);
                if (oldCover) fs.unlink(path.join(__dirname, oldCover), () => {});
            }

            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            await postDoc.save();

            res.json(postDoc);
        } catch (e) {
            console.error('PUT /post error:', e);
            res.status(500).json({ error: e.message });
        }
    });
});

app.get('/post', async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const total = await Post.countDocuments();
        const totalPages = Math.max(Math.ceil(total / POSTS_PER_PAGE), 1);

        const posts = await Post.find()
            .populate('author', ['username', 'avatar'])
            .sort({ createdAt: -1, _id: -1 }) 
            .skip((page - 1) * POSTS_PER_PAGE)
            .limit(POSTS_PER_PAGE);

        res.json({ posts, page, totalPages, total });
    } catch (e) {
        console.error('GET /post error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username', 'avatar']);
    res.json(postDoc);
});

app.get('/post/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ post: req.params.id })
            .populate('author', ['username', 'avatar'])
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/post/:id/comments', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('You must be logged in');
        const content = (req.body.content || '').trim();
        if (!content) return res.status(400).json('Comment cannot be empty!');
        try {
            const doc = await Comment.create({
                post: req.params.id,
                author: info.id,
                content,
            });
            const comment = await Comment.findById(doc._id).populate('author', ['username', 'avatar']);
            res.json(comment);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.delete('/comments/:commentId', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('You must be logged in!');
        try {
            const comment = await Comment.findById(req.params.commentId);
            if (!comment) return res.status(404).json('Comment not found');
            const post = await Post.findById(comment.post);
            const isCommentAuthor = String(comment.author) === String(info.id);
            const isPostAuthor = post && String(post.author) === String(info.id);
            if (!isCommentAuthor && !isPostAuthor) {
                return res.status(403).json('Not allowed');
            }
            await comment.deleteOne();
            res.json('ok');
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.delete('/post/:id', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) return res.status(401).json('You must be logged in');
        try {
            const postDoc = await Post.findById(req.params.id);
            if (!postDoc) return res.status(404).json('Post not found');

            const isAuthor = String(postDoc.author) === String(info.id);
            if (!isAuthor) return res.status(403).json('You are not the author of this post!');

            await Comment.deleteMany({ post: postDoc._id });

            if (postDoc.cover) {
                fs.unlink(require('path').join(__dirname, postDoc.cover), () => {});
            }

            await postDoc.deleteOne();
            res.json('ok');
        } catch (e) {
            console.error('DELETE /post error:', e);
            res.status(500).json({ error: e.message });
        }
    });
});

app.put('/profile/avatar', imageUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json('No file uploaded');

    jwt.verify(req.cookies.token, secret, {}, async (err, info) => {
        if (err) {
            fs.unlink(req.file.path, () => {});
            return res.status(401).json('You must be logged in!');
        }
        try {
            const newPath = saveWithExt(req.file);
            const user = await User.findById(info.id);
            if (user.avatar) fs.unlink(path.join(__dirname, user.avatar), () => {});
            user.avatar = newPath;
            await user.save();
            res.json({ avatar: newPath});
        } catch (e) {
            console.error('PUT /profile/avatar error', e);
            res.status(500).json({ error : e.message});
        }
    });
});

app.get('/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
            .select('username avatar createdAt');
        if (!user) return res.status(404).json('User not found!');

        const posts = await Post.find({ author: user._id })
            .populate('author', ['username', 'avatar'])
            .sort({ createdAt: -1 });

        res.json({ user, posts });
    } catch (e) {
        console.error('GET /user error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.use((err, req, res, next) => {
    if (req.file) fs.unlink(req.file.path, () => {});
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'The image must be 2 MB or smaller!' : err.message;
    res.status(400).json(msg || 'Upload failed!')
})

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on ${PORT}`));