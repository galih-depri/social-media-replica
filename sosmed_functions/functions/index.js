const functions = require("firebase-functions");

const express = require("express");
const app = express();

const post = require("./handlers/post");
const user = require("./handlers/user");
const fbAuth = require("./middlewares/fbAuth");

// Post routes
app.post("/post", fbAuth, post.createPost);
app.get("/posts", post.getAllPosts);
app.get("/post/:postId", post.getPost);
app.post("/post/:postId/comment", fbAuth, post.commentOnPost);
app.get("/post/:postId/likes", fbAuth, post.likePost);
app.get("/post/:postId/unlikes", fbAuth, post.unlikePost);
app.delete("/post/:postId", fbAuth, post.deletePost);

// User routes
app.post("/signup", user.signup);
app.post("/login", user.login);
app.post("/user/image", fbAuth, user.uploadImage);
app.post("/user", fbAuth, user.addUserDetails);
app.get("/user", fbAuth, user.getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
