const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const express = require("express");
const app = express();

const firebaseConfig = {
  apiKey: "AIzaSyBUOZ9OMD6cpEW5tdMXtxxOvWfRZbh_Zjw",
  authDomain: "sosmed-fullstack.firebaseapp.com",
  databaseURL: "https://sosmed-fullstack.firebaseio.com",
  projectId: "sosmed-fullstack",
  storageBucket: "sosmed-fullstack.appspot.com",
  messagingSenderId: "591246054661",
  appId: "1:591246054661:web:e531d433c0a76ecbb2136c",
};
const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);

app.post("/post", (req, res) => {
  const newPost = {
    title: req.body.title,
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString(),
  };
  db.collection("posts")
    .add(newPost)
    .then((doc) => {
      res.status(201).json({
        message: `Document ${doc.id} has successfully been created`,
        //post: doc.data(),
      });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .json({ message: "Oops! Something went wrong", error: err.message });
    });
});

app.get("/posts", (req, res) => {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          postId: doc.id,
          title: doc.data().title,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res
        .status(200)
        .json({ message: "Posts successfully retrieved", posts });
    })
    .catch((err) => {
      console.log(err);
      return res
        .status(500)
        .json({ message: "Oops! Something went wrong", error: err.message });
    });
});

app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  // Validate data HERE
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "This handle already exists" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((getToken) => {
      token = getToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token: token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ error: "Email is already taken" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

exports.api = functions.https.onRequest(app);
