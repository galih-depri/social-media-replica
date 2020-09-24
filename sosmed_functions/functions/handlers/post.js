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
};
