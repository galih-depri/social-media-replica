const { user } = require("firebase-functions/lib/providers/auth");

const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

exports.validateSignUp = (data) => {
  let errors = {};

  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (data.password != data.confirmPassword)
    errors.confirmPassword = "Password doesn't match";
  if (isEmpty(data.handle)) errors.handle = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLogin = (data) => {
  let errors = {};

  if (isEmpty(data.password)) errors.password = "Please provide password";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    // https://website.com
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }
  if (!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};
