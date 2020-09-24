const functions = require("firebase-functions");

const express = require("express");
const app = express();

const post = require("./handlers/post");
const user = require("./handlers/user");
const fbAuth = require("./middlewares/fbAuth");

// Post routes
app.post("/post", fbAuth, post.createPost);
app.get("/posts", post.getAllPosts);
app.get("/posts/:postId", post.getPost);
app.post("/posts/:postId/comment", fbAuth, post.commentOnPost);
app.get("/posts/:postId/likes", fbAuth, post.likePost);
app.get("/posts/:postId/unlikes", fbAuth, post.unlikePost);

// User routes
app.post("/signup", user.signup);
app.post("/login", user.login);
app.post("/user/image", fbAuth, user.uploadImage);
app.post("/user", fbAuth, user.addUserDetails);
app.get("/user", fbAuth, user.getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
