const functions = require("firebase-functions");

const express = require("express");
const app = express();
const morgan = require("morgan");

const post = require("./handlers/post");
const user = require("./handlers/user");
const fbAuth = require("./middlewares/fbAuth");
const { db } = require("./util/admin");

// Config
app.use(morgan("dev"));

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
app.get("/user/:handle", user.getUserDetails);
app.post("/notifications", fbAuth, user.markNotificationRead);

exports.api = functions.https.onRequest(app);

exports.createLikeNotification = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => console.error(err));
  });

exports.deleteLikeNotification = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createCommentNotification = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.onUserImageChange = functions.firestore
  .document("/users/{id}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());

    if (change.before.data().imageURL !== change.after.data().imageURL) {
      console.log("Image has been updated");
      let batch = db.batch();
      return db
        .collection("posts")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/posts/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageURL });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onPostDeete = functions.firestore
  .document("/posts/{postId}")
  .onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("postId", "==", postId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("postId", "==", postId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("postId", "==", postId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => {
        console.error(err);
      });
  });
