const controller = require('../controllers/auth')
const authControllerAdmin = require('../controllers/auth.admin')
const validate = require('../controllers/auth.validate')
const AuthController = require('../controllers/auth')
const express = require('express')
const router = express.Router();
const authenticateUser = require('../middleware/auhenticate')
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

/*
 * testing routes
 */
router.get('/test', trimRequest.all, controller.test)
/*
 * Auth routes
 */

router.post(
  '/checkUsernameAvailability',
  trimRequest.all,
  validate.checkUsernameAvailability,
  controller.checkUsernameAvailability
)

router.post(
  '/checkEmailAvailability',
  trimRequest.all,
  validate.checkEmailAvailability,
  controller.checkEmailAvailability
)

/*
 * Register route
 */
router.post(
  '/register',
  trimRequest.all,
  validate.register,
  controller.register
)

router.post(
  '/send/user/credentials',
  trimRequest.all,
  // validate.register,
  controller.sendUserCredentials
)

/*
 * Verify email route
 */
router.get('/verifyEmail/:id', trimRequest.all, controller.verifyEmail)


router.get(
  '/verifyEmailforapp/:id',
  trimRequest.all,
  controller.verifyEmailforapp
)
router.post(
  "/admin/login",
  trimRequest.all,
  authControllerAdmin.login
);

/*
 * Forgot password email generation route
 */
router.post(
  '/sendForgotPasswordEmail',
  trimRequest.all,
  controller.sendForgotPasswordEmail
)

/*
 * Reset forgot password route
 */

router.patch(
  '/resetForgotPassword',
  trimRequest.all,
  controller.resetForgotPassword
)
router.patch(
  '/resetForgotPasswordforapp',
  trimRequest.all,
  controller.resetForgotPasswordforapp
)
router.patch(
  '/admin/resetForgotPassword',
  trimRequest.all,
  controller.adminResetForgotPassword
)

/*
 * Get new refresh token
 */
router.get(
  '/token',
  authenticateUser(["user"]),
  AuthController.roleAuthorization(['user', 'admin']),
  trimRequest.all,
  controller.getRefreshToken
)

/*
 * Login route
 */
router.post('/login', trimRequest.all, validate.login, controller.login)

/*
 * Social Login route
 */
router.post(
  '/social/login',
  trimRequest.all,
  validate.socialLogin,
  controller.socialLogin
)

/*
 * Change Password
 */
router.post(
  '/change/password',
  trimRequest.all,
  authenticateUser(["user"]),
  controller.changePassword
)

router.post(
  '/two/step/verification',
  trimRequest.all,
  authenticateUser(["user"]),
  // validate.changePassword,
  controller.twoStepVerification
)

router.post('/sendOtp', trimRequest.all, controller.sendOtp)

router.post('/loginWithPhone', trimRequest.all, controller.loginWithPhone)

router.get('/getAllCountries', trimRequest.all, controller.GetAllCountries)

router.get(
  '/getStatesOfCountry',
  trimRequest.all,
  controller.getStatesOfCountry
)

router.get('/getCitiesOfState', trimRequest.all, controller.getCitiesOfState);
router.post("/approvedRequest",authenticateUser(["user"]),trimRequest.all, controller.approveAccessByUser)

module.exports = router
