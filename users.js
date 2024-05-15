const controller = require("../controllers/users");
const validate = require("../controllers/users.validate");
const express = require("express");
const router = express.Router();
require("../../config/passport");
const passport = require("passport");
const requireAuth = passport.authenticate("jwt", {
  session: false,
});
const trimRequest = require("trim-request");


router.get(
  '/test',
  trimRequest.all,
  controller.test
)
/*
 * Users routes
*/

router.get(
  "/getUserProfile",
  trimRequest.all,
  requireAuth,
  controller.getUserProfile
);

router.patch(
  "/editUserProfile",
  trimRequest.all,
  requireAuth,
  controller.editUserProfile
);


router.post(
  "/create/sub/user",
  trimRequest.all,
  requireAuth,
  controller.createSubUser
);

router.patch(
  "/edit/sub/user",
  trimRequest.all,
  // requireAuth,
  controller.editSubUser
);

router.get(
  "/get/sub/users",
  trimRequest.all,
  requireAuth,
  controller.getSubUsers
);

router.post(
  "/uploadUserMedia",
  trimRequest.all,
  // requireAuth,
  controller.uploadUserMedia
);

router.post(
  "/uploadMultipleUserMedia",
  trimRequest.all,
  requireAuth,
  controller.uploadMultipleUserMedia
);


router.get(
  "/getCountries",
  trimRequest.all,
  // requireAuth,
  controller.getCountries
);


router.get(
  "/getStates",
  trimRequest.all,
  // requireAuth,
  controller.getStates
);

router.get(
  "/getCities",
  trimRequest.all,
  // requireAuth,
  controller.getCities
);

router.post(
  "/add/store",
  trimRequest.all,
  requireAuth,
  controller.addStore
);

router.get(
  "/get/store",
  trimRequest.all,
  requireAuth,
  controller.getStore
);

router.patch(
  "/edit/store",
  trimRequest.all,
  requireAuth,
  controller.editStore
);

router.post(
  "/delete/store",
  trimRequest.all,
  requireAuth,
  controller.deleteStore
);

router.get(
  "/get/cms/:type",
  trimRequest.all,
  controller.getCms
);

router.get(
  "/get/about/us/other",
  trimRequest.all,
  controller.getAboutUsOther
);

router.get(
  "/get/about/us/by/:id",
  trimRequest.all,
  controller.getAboutUsById
);

router.get(
  "/get/emails",
  trimRequest.all,
  requireAuth,
  controller.getEmails
);

router.post(
  "/add/emails",
  trimRequest.all,
  requireAuth,
  controller.addEmails
);

router.get(
  "/get/car/details",
  trimRequest.all,
  controller.getCarDetails
);

router.post(
  "/update/destroy/email",
  trimRequest.all,
  requireAuth,
  controller.updateDestroyEmail
);

router.post(
  "/client",
  trimRequest.all,
  requireAuth,
  controller.client
);

router.get(
  "/get/client",
  trimRequest.all,
  requireAuth,
  controller.getClient
);

router.post(
  "/download/csv",
  trimRequest.all,
  controller.downloadCsv
);

router.post(
  "/invoice",
  trimRequest.all,
  requireAuth,
  controller.invoice
);

router.post(
  "/quote",
  requireAuth,
  trimRequest.all,
  controller.quote
);

router.post(
  "/addContactUs",
  trimRequest.all,
  controller.addContactUs
)

router.get(
  "/get/faqs",
  trimRequest.all,
  controller.getFaqs
);

router.post(
  "/subscription",
  trimRequest.all,
  controller.subscription
);

router.post(
  "/get/subscription",
  trimRequest.all,
  controller.getSubscription
);

router.get(
  "/user/features",
  trimRequest.all,
  controller.userFeatures
);

router.post(
  "/free/quotes",
  trimRequest.all,
  requireAuth,
  controller.freeQuotes
);

router.post(
  "/calendar",
  trimRequest.all,
  requireAuth,
  controller.calendar
);
module.exports = router;
