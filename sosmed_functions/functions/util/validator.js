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
