const controller = require('../controllers/admin')
const authController = require('../controllers/auth.admin')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const authenticateUser = require('../middleware/auhenticate')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')
const validator = require('../controllers/admin.validate')
// const { roleAuthorization, privilegeAuthorization } = require('../guards/admin')
/*
 * Before Login Routes
 */

router.post('/login', trimRequest.all, authController.login)

router.post(
  '/sendForgotPasswordEmail',
  trimRequest.all,
  authController.sendForgotPasswordEmail
)

router.patch(
  '/resetForgotPassword',
  trimRequest.all,
  authController.resetForgotPassword
)

/*
 * Upload File After
 */

router.post(
  '/uploadAdminMedia',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.uploadAdminMedia
)

/*
 * After Login Routes
 */

router.get(
  '/getAdminProfile',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.getAdminProfile
)

router.patch(
  '/editAdminProfile',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.editAdminProfile
)

router.post(
  '/matchOldPassword',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.matchOldPassword
)

router.patch(
  '/resetPassword',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.resetPassword
)

router.get('/get/cms/:type', trimRequest.all, controller.getCms)

router.patch('/update/cms', trimRequest.all, controller.updateCms)

router.post(
  '/addFaqTopic',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  // privilegeAuthorization('faqs_topic_management', 'add'),
  controller.addFaqTopic
)

router.get(
  '/getFaqTopics',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  // privilegeAuthorization('faqs_topic_management', 'view'),
  controller.getFaqTopics
)

router.get(
  '/getFaqTopicDetails/:topic_id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  // privilegeAuthorization('faqs_topic_management', 'view'),
  controller.getFaqTopicDetails
)

router.patch(
  '/updateFaqTopic/:topic_id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  // privilegeAuthorization('faqs_topic_management', 'edit'),
  controller.updateFaqTopic
)

router.delete(
  '/deleteFaqTopic/:topic_id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  // privilegeAuthorization('faqs_topic_management', 'delete'),
  controller.deleteFaqTopic
)

router.post('/add/faq', trimRequest.all, controller.addFaq)

router.get('/get/faqs', trimRequest.all, controller.getFaqs)

router.get(
  '/get/faq/details/:faq_id',
  trimRequest.all,
  controller.getFaqDetails
)

router.patch('/update/faq/:faq_id', trimRequest.all, controller.updateFaq)

router.post('/delete/faq/:faq_id', trimRequest.all, controller.deleteFaq)

router.get(
  '/getUsers',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.getUsers
)

router.get(
  '/getUserDetails/:user_id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.getUserDetails
)

router.post(
  '/add/store',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.addStore
)

router.get(
  '/get/store',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.getStore
)
router.get(
  '/get/store/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.getStoreById
)

router.patch(
  '/edit/store/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.editStore
)
router.patch(
  '/update/store/status/:id',
  trimRequest.all,
  controller.updateStoreStatus
)
router.delete(
  '/delete/store/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.deleteStore
)

router.post(
  '/uploadUserMedia',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.uploadUserMedia
)

router.post(
  '/create/sub/user',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.createSubUser
)
router.get(
  '/subsusers/:id',
  authenticateUser(['superAdmin']),
  controller.getSubUSers
)

router.patch(
  '/edit/subuser/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.editSubUser
)
router.get(
  '/subuser/:id',
  authenticateUser(['superAdmin']),
  controller.getSingleSubUser
)

router.delete(
  '/delete/subuser/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.deleteSubUsers
)

router.post('/create/about/us/other', trimRequest.all, controller.aboutUsOther)

router.get('/get/about/us/other', trimRequest.all, controller.getAboutUsOther)

router.get('/get/about/us/by/:id', trimRequest.all, controller.getAboutUsById)

router.patch('/edit/about/us/:id', trimRequest.all, controller.editAboutUs)

router.post('/delete/about/us/:id', trimRequest.all, controller.deleteAboutUs)

router.get(
  '/view/user/detail/:id',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.viewUserDetail
)

router.post('/add/car/details', trimRequest.all, controller.addCarDetails)

router.get('/get/car/details', trimRequest.all, controller.getCarDetails)

router.get('/getContactUs', trimRequest.all, controller.getContactUs)

router.delete(
  '/delete/contactUs/:_id',
  trimRequest.all,
  controller.deleteContactUs
)

router.post('/addContactUs', trimRequest.all, controller.addContactUs)
router.patch(
  '/update/contactUs/:_id',
  trimRequest.all,
  controller.updateContactUs
)

router.post('/subscription', trimRequest.all, controller.subscription)

router.post('/garage/user', trimRequest.all, controller.garageUser)
/* router.post(
  "/free/quote",
  trimRequest.all,
  controller.freeQuote
); */

router.post('/user/features', trimRequest.all, controller.userFeatures)

router.post('/change/password', trimRequest.all, controller.changePassword)
router.post('/addcarWithlogo', trimRequest.all, controller.addcarWithlogo)

router.post('/addCategory', trimRequest.all, controller.addCategory)

router.patch('/editcarmodel/:id', trimRequest.all, controller.editcarmodel)

router.get('/findallcarlogos', trimRequest.all, controller.findallcarlogos)

router.delete('/deletecarmodel/:id', trimRequest.all, controller.deletecarmodel)

router.post(
  '/add/fcm/token',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.addFcmToken
)

router.post(
  '/remove/fcm/token',
  trimRequest.all,
  authenticateUser(['superAdmin']),
  controller.removeFcmToken
)

router.post(
  '/addinsurence',
  trimRequest.all,
  // authenticateUser(["superAdmin"]),
  controller.addinsurence
)

router.get(
  '/getinsurance',
  trimRequest.all,
  // authenticateUser(["superAdmin"]),
  controller.getinsurence
)

router.patch(
  '/editinsurence',
  trimRequest.all,
  // authenticateUser(["superAdmin"]),
  controller.editinsurence
)
router.get('/getInsurace/:id', trimRequest.all, controller.getSingleInsurance)

router.delete(
  '/deleteinsurence/:id',
  trimRequest.all,
  // authenticateUser(["superAdmin"]),
  controller.deleteinsurence
)

router.patch(
  '/updateNotification',
  trimRequest.all,
  // authenticateUser(["superAdmin"]),
  controller.updateNotification
)
router.get(
  '/get-contact-us/:id',
  trimRequest.all,
  controller.getSingleContactUs
)
router.get(
  '/get-notifications',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.adminNotifications
)
router.delete(
  '/delete-notifications',
  trimRequest.all,
  controller.deleteNotifications
)
router.get('/all-cars', trimRequest.all, controller.getAllCars)
router.get('/insurance', trimRequest.all, controller.getAdminInsurance)
router.post(
  '/send-reply/:id',
  trimRequest.all,
  controller.sendReplyToContactUsUser
)
router.patch(
  '/update-insurance-status/:id',
  trimRequest.all,
  controller.updateInsuranceStatus
)
router.patch(
  '/update-car-status/:id',
  trimRequest.all,
  controller.updateCarStatus
)
router.patch(
  '/read-all-notifications',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.readAllNotifications
)
router.post(
  '/add-store',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.createStore
)
router.get(
  '/all-requests',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.getAllRequests
)
router.patch(
  '/update-carModel',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.approvedCarModelRequest
)
router.get(
  '/users-data',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.getTotalUsersData
)
router.get(
  '/number-of-invoices',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.numberOfInvoices
)
router.get(
  '/total-sales',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.totalSales
)
router.get(
  '/today-data',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.getTodayData
)
router.get(
  '/billing-info/:id',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.getClientCards
)
router.get(
  '/client-transactions/:id',
  authenticateUser(['superAdmin']),
  trimRequest.all,
  controller.getClientTransactions
)
router.get('/customers-list', controller.getCustomerList)
router.get('/invoices-list', controller.getInvoiceList)
router.post(
  '/send-login-request/:id/:queryId',
  authenticateUser(['superAdmin']),
  controller.sendRequestForLogin
)
router.post('/add-fcm-token', controller.add_fcm_token)
router.post('/add-vat', authenticateUser(['superAdmin']), controller.addVat)
router.get('/vat-list', authenticateUser(['superAdmin']), controller.getVatList);
router.get("/single-vat/:id", authenticateUser(["superAdmin"]), controller.getSingleVat);
router.delete("/delete-vat/:id", authenticateUser(["superAdmin"]), controller.deleteVatList);
router.patch("/edit-vat/:id", authenticateUser(['superAdmin']), controller.editVat);

router.post("/send-remainder-appointments/:id",
//  authenticateUser(["superAdmin"]),
 controller.sendRemainderForAppointments)

module.exports = router
