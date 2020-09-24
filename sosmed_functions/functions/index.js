const functions = require("firebase-functions");

const express = require("express");
const app = express();

const post = require("./handlers/post");
const user = require("./handlers/user");
const fbAuth = require("./middlewares/fbAuth");

// Post routes
app.post("/post", fbAuth, post.createPost);
app.get("/posts", post.getAllPosts);

// User routes
app.post("/signup", user.signup);
app.post("/login", user.login);
app.post("/user/image", fbAuth, user.uploadImage);

exports.api = functions.https.onRequest(app);
