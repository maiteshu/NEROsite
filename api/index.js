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
const uploadMiddleware = multer({ dest: 'uploads/' });
const avatarUpload = multer({
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
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

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { title, summary, content } = req.body;
        const PostDoc = await Post.create({
            title,
            summary,
            content,
            cover: newPath,
            author: info.id,
        });
        res.json(PostDoc);
    });
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext; 
        fs.renameSync(path, newPath);
    }

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id); 
        
        if (!postDoc) {
            return res.status(404).json('Post not found');
        }

        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
            return res.status(400).json('You are not the author of this post!');
        }

        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover, 
        });

        const updatedPost = await Post.findById(id);
        res.json(updatedPost);
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

app.put('/profile/avatar', (req, res) => {
    avatarUpload.single('file')(req, res, (uploadErr) => {
        if (uploadErr) return res.status(400).json(uploadErr.message);
        if (!req.file) return res.status(400).json('No file uploaded');

        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async (err, info) => {
            if (err) {
                fs.unlink(req.file.path, () => {});
                return res.status(401).json('You must be logged in');
            }
            try {
                const ext = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
                const newPath = (req.file.path + '.' + ext).replace(/\\/g, '/');
                fs.renameSync(req.file.path, newPath);

                const user = await User.findById(info.id);
                if (user.avatar) {
                    fs.unlink(path.join(__dirname, user.avatar), () => {}); // delete old one
                }
                user.avatar = newPath;
                await user.save();
                res.json({ avatar: newPath });
            } catch (e) {
                console.error('PUT /profile/avatar error:', e);
                res.status(500).json({ error: e.message });
            }
        });
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


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on ${PORT}`));