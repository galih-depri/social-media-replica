const { db } = require("../util/admin");

module.exports = {
  // Create a post
  createPost: (req, res) => {
    if (req.body.body.trim() === "") {
      return res.status(400).json({ body: "Post body must not be empty" });
    }

    const newPost = {
      body: req.body.body,
      userHandle: req.user.handle,
      createdAt: new Date().toISOString(),
      imageURL: req.user.imageURL,
      likeCount: 0,
      commentCount: 0,
    };
    db.collection("posts")
      .add(newPost)
      .then((doc) => {
        const responsePost = newPost;
        responsePost.postId = doc.id;
        res.status(201).json({
          message: `Post with ID ${doc.id} has successfully been created`,
          data: responsePost,
        });
      })
      .catch((err) => {
        console.log(err);
        res
          .status(500)
          .json({ message: "Oops! Something went wrong", error: err.message });
      });
  },

  // Get all posts
  getAllPosts: (req, res) => {
    db.collection("posts")
      .orderBy("createdAt", "desc")
      .get()
      .then((data) => {
        let posts = [];
        data.forEach((doc) => {
          posts.push({
            postId: doc.id,
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
  },

  // Get a post by ID
  getPost: (req, res) => {
    let postData = {};
    db.doc(`/posts/${req.params.postId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "Post not found!" });
        }
        postData = doc.data();
        postData.postId = doc.id;
        return db
          .collection("comments")
          .orderBy("createdAt", "desc")
          .where("postId", "==", req.params.postId)
          .get();
      })
      .then((data) => {
        postData.comments = [];
        data.forEach((doc) => {
          postData.comments.push(doc.data());
        });
        return res.status(200).json(postData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  // Delete a post by ID
  deletePost: (req, res) => {
    const document = db.doc(`/posts/${req.params.postId}`);

    document
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "Post not found!" });
        }
        if (doc.data().userHandle !== req.user.handle) {
          res.status(403).json({ error: "Unauthorized!" });
        } else {
          return document.delete();
        }
      })
      .then(() => {
        res.status(200).json({ message: "Post has successfully been deleted" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  // Write a comment on a post
  commentOnPost: (req, res) => {
    if (req.body.body.trim() === "")
      return res.status(400).json({ error: "Must not be empty" });

    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      postId: req.params.postId,
      userHandle: req.user.handle,
      userImage: req.user.imageURL,
    };

    db.doc(`/posts/${req.params.postId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "Post is no longer available" });
        }
        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection("comments").add(newComment);
      })
      .then(() => {
        res.status(201).json(newComment);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  // Like a post
  likePost: (req, res) => {
    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("postId", "==", req.params.postId)
      .limit(1);

    const postDocument = db.doc(`/posts/${req.params.postId}`);

    let postData = {};

    postDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          postData = doc.data();
          postData.postId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: "Post is not found!" });
        }
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection("likes")
            .add({
              postId: req.params.postId,
              userHandle: req.user.handle,
            })
            .then(() => {
              postData.likeCount++;
              return postDocument.update({ likeCount: postData.likeCount });
            })
            .then(() => {
              return res.status(201).json(postData);
            });
        } else {
          return res.status(400).json({ error: "Post already liked" });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  // Unlike a post
  unlikePost: (req, res) => {
    const likeDocument = db
      .collection("likes")
      .where("userHandle", "==", req.user.handle)
      .where("postId", "==", req.params.postId)
      .limit(1);

    const postDocument = db.doc(`/posts/${req.params.postId}`);

    let postData = {};

    postDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          postData = doc.data();
          postData.postId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: "Post is not found!" });
        }
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: "Post already unliked" });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              postData.likeCount--;
              return postDocument.update({ likeCount: postData.likeCount });
            })
            .then(() => {
              res.status(201).json(postData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },
};
