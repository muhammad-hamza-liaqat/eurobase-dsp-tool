const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const utils = require("../middleware/utils");
const uuid = require("uuid");
const { addHours } = require("date-fns");
const auth = require("../middleware/auth");
const emailer = require("../middleware/emailer");
const HOURS_TO_BLOCK = 2;
const LOGIN_ATTEMPTS = 5;
const { capitalizeFirstLetter } = require("../shared/helpers");
const ForgotPassword = require("../models/forgotPassword");
const { getItemCustom } = require("../shared/core");
/*********************
 * Private functions *
 *********************/

/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateAdminToken = (user) => {
  // Gets expiration time
  const expiration =
    Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES;

  // returns signed and encrypted token
  const secretKey = process.env.JWT_SECRET;
  const expiresIn =
    Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES;

  user = {
    _id: user._id,
    role: "superAdmin",
  };
  return jwt.sign({user}, secretKey, {
    expiresIn,
    algorithm: "HS256",
  });
};

/**
 * Creates an object with user info
 * @param {Object} req - request object
 */
const setUserInfo = (req) => {
  let user = {
    id: req.id,
    name: req.name,
    email: req.email,
    // role: req.role,
    //verified: req.verified
  };
  // Adds verification for testing purposes
  if (process.env.NODE_ENV !== "production") {
    user = {
      ...user,
      verification: req.verification,
    };
  }
  return user;
};

/**
 * Saves a new user access and then returns token
 * @param {Object} req - request object
 * @param {Object} user - user object
 */
const saveUserAccessAndReturnToken = async (req, user) => {
  return new Promise((resolve, reject) => {
    const userAccess = new UserAccess({
      email: user.email,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req),
    });

    model.UserAccess.create({
      email: user.email,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req),
    })
      .then((acc) => {
        const userInfo = setUserInfo(user);
        resolve({
          token: generateToken(user._id),
          user: user,
        });
      })
      .catch((err) => {
        reject(utils.buildErrObject(422, err.message));
      });
  });
};

/**
 * Blocks a user by setting blockExpires to the specified date based on constant HOURS_TO_BLOCK
 * @param {Object} user - user object
 */
const blockUser = async (user) => {
  return new Promise((resolve, reject) => {
    user.blockExpires = addHours(new Date(), HOURS_TO_BLOCK);
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message));
      }
      if (result) {
        resolve(utils.buildErrObject(409, "BLOCKED_USER"));
      }
    });
  });
};

/**
 * Saves login attempts to dabatabse
 * @param {Object} user - user object
 */
const saveLoginAttemptsToDB = async (user) => {
  return new Promise((resolve, reject) => {
    user
      .save()
      .then((flag) => {
        resolve(true);
      })
      .catch((err) => {
        reject(utils.buildErrObject(422, err.message));
      });
  });
};

/**
 * Checks that login attempts are greater than specified in constant and also that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = (user) =>
  user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date();

/**
 *
 * @param {Object} user - user object.
 */
const checkLoginAttemptsAndBlockExpires = async (user) => {
  return new Promise((resolve, reject) => {
    // Let user try to login again after blockexpires, resets user loginAttempts
    if (blockIsExpired(user)) {
      user.loginAttempts = 0;
      user
        .save()
        .then((data) => {
          resolve(true);
        })
        .catch((err) => {
          reject(utils.buildErrObject(422, err.message));
        });
    } else {
      // User is not blocked, check password (normal behaviour)
      resolve(true);
    }
  });
};

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsBlocked = async (user) => {
  return new Promise((resolve, reject) => {
    if (user.blockExpires > new Date()) {
      reject(utils.buildErrObject(409, "BLOCKED_USER"));
    }
    resolve(true);
  });
};

/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findAdmin = async (email) => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email,
      },
      "password loginAttempts blockExpires name email role verified verification privileges is_active",
      (err, item) => {
        utils.itemNotFound(err, item, reject, "ADMIN_DOES_NOT_EXIST");
        resolve(item);
      }
    );
  });
};

/**
 * Finds user by ID
 * @param {string} id - user´s id
 */
const findUserById = async (userId) => {
  return new Promise((resolve, reject) => {
    User.findById(userId, (err, item) => {
      utils.itemNotFound(err, item, reject, "USER_DOES_NOT_EXIST");
      resolve(item);
    });
  });
};

/**
 * Adds one attempt to loginAttempts, then compares loginAttempts with the constant LOGIN_ATTEMPTS, if is less returns wrong password, else returns blockUser function
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async (user) => {
  user.loginAttempts += 1;
  await saveLoginAttemptsToDB(user);
  return new Promise((resolve, reject) => {
    if (user.loginAttempts <= LOGIN_ATTEMPTS) {
      resolve(utils.buildErrObject(409, "WRONG_PASSWORD"));
    } else {
      resolve(blockUser(user));
    }
    reject(utils.buildErrObject(422, "ERROR"));
  });
};

/**
 * Marks a request to reset password as used
 * @param {Object} req - request object
 * @param {Object} forgot - forgot object
 */
const markResetPasswordAsUsed = async (req, forgot) => {
  return new Promise((resolve, reject) => {
    forgot.used = true;
    forgot.ipChanged = utils.getIP(req);
    forgot.browserChanged = utils.getBrowserInfo(req);
    forgot.countryChanged = utils.getCountry(req);
    forgot.save((err, item) => {
      utils.itemNotFound(err, item, reject, "NOT_FOUND");
      resolve(utils.buildSuccObject("PASSWORD_CHANGED"));
    });
  });
};

/**
 * Updates a user password in database
 * @param {string} password - new password
 * @param {Object} user - user object
 */
const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password;
    user.save((err, item) => {
      utils.itemNotFound(err, item, reject, "NOT_FOUND");
      resolve(item);
    });
  });
};

/**
 * Creates a new password forgot
 * @param {Object} req - request object
 */
const saveForgotPassword = async (req) => {
  return new Promise((resolve, reject) => {
    const forgot = new ForgotPassword({
      email: req.body.email,
      verification: uuid.v4(),
      ipRequest: utils.getIP(req),
      browserRequest: utils.getBrowserInfo(req),
      countryRequest: utils.getCountry(req),
      type: "admin",
    });
    forgot.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message));
      }
      resolve(item);
    });
  });
};

/**
 * Checks if a forgot password verification exists
 * @param {string} id - verification id
 */
const findForgotPassword = async (id) => {
  return new Promise((resolve, reject) => {
    ForgotPassword.findOne(
      {
        verification: id,
        used: false,
      },
      (err, item) => {
        utils.itemNotFound(err, item, reject, "NOT_FOUND_OR_ALREADY_USED");
        resolve(item);
      }
    );
  });
};

/**
 * Builds an object with created forgot password object, if env is development or testing exposes the verification
 * @param {Object} item - created forgot password object
 */
const forgotPasswordResponse = (item) => {
  let data = {
    msg: "RESET_EMAIL_SENT",
    email: item.email,
  };
  if (process.env.NODE_ENV !== "production") {
    data = {
      ...data,
      verification: item.verification,
    };
  }
  return data;
};

/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissions = async (data, next) => {
  return new Promise((resolve, reject) => {
    User.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, "NOT_FOUND");
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next());
      }
      return reject(utils.buildErrObject(401, "UNAUTHORIZED"));
    });
  });
};

/**
 * Gets user id from token
 * @param {string} token - Encrypted and encoded token
 */
const getUserIdFromToken = async (token) => {
  return new Promise((resolve, reject) => {
    // Decrypts, verifies and decode token
    jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(utils.buildErrObject(409, "BAD_TOKEN"));
      }
      resolve(decoded.data._id);
    });
  });
};

/********************
 * Public functions *
 ********************/

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.login = async (req, res) => {
  try {
    const data = req.body;

    const admin = await findAdmin(data.email);

    await userIsBlocked(admin);

    await checkLoginAttemptsAndBlockExpires(admin);
    const isPasswordMatch = await auth.checkPassword(data.password, admin);

    if (!isPasswordMatch) {
      return utils.handleError(res, await passwordsDoNotMatch(admin));
    }

    if (!admin.is_active) {
      return utils.handleError(
        res,
        utils.buildErrObject(422, "ACCOUNT INACTIVE")
      );
    }

    // all ok, register access and return token

    admin.loginAttempts = 0;

    await saveLoginAttemptsToDB(admin);

    let result = JSON.parse(JSON.stringify(admin));
    delete result.password;

    if (result.role == "superAdmin") {
      delete result.privileges;
    }
    return res.status(200).json({
      token: await generateAdminToken(admin._id),
      data: result,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.sendForgotPasswordEmail = async (req, res) => {
  try {
    const locale = req.getLocale(); // Gets locale from header 'Accept-Language'
    const data = req.body;
    const admin = await findAdmin(data.email);
    let forgotPassword = await getItemCustom(ForgotPassword, {
      email: data.email,
      used: false,
      type: "admin",
    });
    forgotPassword = forgotPassword.data;
    if (!forgotPassword) {
      forgotPassword = await saveForgotPassword(req);
    }
    let mailOptions = {
      to: data.email,
      subject: "Forgot Password",
      name: capitalizeFirstLetter(admin.name),
      url: `${
        data.is_development ? process.env.LOCAL_URL : process.env.ADMIN_URL
      }#/reset-password/${forgotPassword.verification}`,
    };
    emailer.sendEmail(locale, mailOptions, "admin/forgotPasswordAdmin");
    res.status(200).json(forgotPasswordResponse(forgotPassword));
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetForgotPassword = async (req, res) => {
  try {
    const data = req.body;
    const forgotPassword = await findForgotPassword(data.verification);
    const admin = await findAdmin(forgotPassword.email);
    await updatePassword(data.password, admin);
    const result = await markResetPasswordAsUsed(req, forgotPassword);
    res.status(200).json(result);
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Refresh token function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getRefreshToken = async (req, res) => {
  try {
    const tokenEncrypted = req.headers.authorization
      .replace("Bearer ", "")
      .trim();
    let userId = await getUserIdFromToken(tokenEncrypted);
    userId = await utils.isIDGood(userId);
    const user = await findUserById(userId);
    const token = await saveUserAccessAndReturnToken(req, user);
    // Removes user info from response
    delete token.user;
    res.status(200).json(token);
  } catch (error) {
    utils.handleError(res, error);
  }
};

/**
 * Roles authorization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorization = (roles) => async (req, res, next) => {
  try {
    const data = {
      id: req.user._id,
      roles,
    };
    await checkPermissions(data, next);
  } catch (error) {
    utils.handleError(res, error);
  }
};

// exports.createAdmin = async (req, res) => {
//   try {
//     Admin.create({
//       name: "Acclum",
//       email: "acclum@mailinator.com",
//       password: "123456",
//       verified: true,
//       phone: "123445678"
//     })
//     res.status(200).json(200)

//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }
