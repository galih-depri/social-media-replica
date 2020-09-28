const { db, admin } = require("../util/admin");
const { firebaseConfig } = require("../config/firebaseConfig");

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);
const shortUuid = require("short-uuid");
const {
  validateSignUp,
  validateLogin,
  reduceUserDetails,
} = require("../util/validator");

module.exports = {
  signup: (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
      imageURL:
        "https://firebasestorage.googleapis.com/v0/b/sosmed-fullstack.appspot.com/o/default-profile-picture1.jpg?alt=media",
    };

    // Validate data HERE
    const { valid, errors } = validateSignUp(newUser);

    if (!valid) return res.status(400).json(errors);
    // End of VALIDATION

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
          imageURL: newUser.imageURL,
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
        } else if (err.code === "auth/invalid-email") {
          return res
            .status(400)
            .json({ error: "Please fill in the email with correct format" });
        } else {
          return res.status(500).json({ error: err.code });
        }
      });
  },

  login: (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };

    // VALIDATION
    const { valid, errors } = validateLogin(user);

    if (!valid) return res.status(400).json(errors);
    // End of VALIDATION

    firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({ token });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === "auth/wrong-password") {
          return res.status(403).json({ general: "Wrong credentials" });
        } else {
          return res.status(500).json({ code: err.code, error: err.message });
        }
      });
  },

  uploadImage: (req, res) => {
    const Busboy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new Busboy({ headers: req.headers });
    let imageFileName;
    let imageToBeUploaded;

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/png")
        return res
          .status(400)
          .json({ message: "Please only upload jpeg/png file format" });
      const imageExtension = filename.split(".")[
        filename.split(".").length - 1
      ];
      imageFileName = `${shortUuid.generate()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    let imageURL;
    busboy.on("finish", () => {
      admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        })
        .then(() => {
          imageURL = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${req.user.handle}`).update({ imageURL });
        })
        .then(() => {
          return res
            .status(201)
            .json({ message: "Image uploaded successfully!", URL: imageURL });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ code: err.code, error: err.message });
        });
    });

    busboy.end(req.rawBody);
  },

  // Add user details
  addUserDetails: (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`)
      .update(userDetails)
      .then(() => {
        return res.status(201).json("User details updated successfully!");
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  // Get any user details
  getUserDetails: (req, res) => {
    let userData = {};

    db.doc(`/users/${req.params.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.user = doc.data();
          return db
            .collection("posts")
            .where("userHandle", "==", req.params.handle)
            .orderBy("createdAt", "desc")
            .get();
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      })
      .then((data) => {
        userData.posts = [];
        data.forEach((doc) => {
          userData.posts.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            postId: doc.data().postId,
          });
        });
        return res.status(200).json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  getAuthenticatedUser: (req, res) => {
    let userData = {};

    db.doc(`/users/${req.user.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection("likes")
            .where("userHandle", "==", req.user.handle)
            .get();
        }
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .get();
      })
      .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            postId: doc.data().postId,
            type: doc.data().type,
            read: doc.data().read,
            notificationsId: doc.id,
          });
        });
        return res.status(200).json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },

  markNotificationRead: (req, res) => {
    let batch = db.batch();

    req.body.forEach((notificationId) => {
      const notification = db.doc(`/notifications/${notificationId}`);
      batch.update(notification, { read: true });
    });
    batch
      .commit()
      .then(() => {
        return res.status(201).json({ message: "Notification marked read" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ code: err.code, error: err.message });
      });
  },
};
