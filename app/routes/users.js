const controller = require('../controllers/users')
const validate = require('../controllers/users.validate')
const authenticateUser = require('../middleware/auhenticate')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

router.get('/download-invoice/:id', trimRequest.all, controller.downloadInvoice)

router.get('/findallcarlogos', trimRequest.all, controller.findallcarlogos)

router.get(
  '/findallcarmodel',
  authenticateUser(['user']),
  trimRequest.all,
  controller.findallcarmodel
)
/*
 * Users routes
 */

router.get(
  '/getUserProfile',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getUserProfile
)

router.patch(
  '/editUserProfile',
  trimRequest.all,
  authenticateUser(['user']),
  controller.editUserProfile
)

router.post(
  '/create/sub/user',
  trimRequest.all,
  authenticateUser(['user']),
  controller.createSubUser
)

router.post(
  '/create/sub/user/verification/:id/:token',
  trimRequest.all,
  // authenticateUser(['user']),
  controller.verifySubUser
)

router.patch(
  '/edit/sub/user',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.editSubUser
)

router.get(
  '/get/sub/users',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getSubUsers
)

router.post(
  '/uploadUserMedia',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.uploadUserMedia
)

router.post(
  '/uploadMultipleUserMedia',
  trimRequest.all,
  authenticateUser(['user']),
  controller.uploadMultipleUserMedia
)

router.get(
  '/getCountries',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.getCountries
)

router.get(
  '/getStates',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.getStates
)

router.get(
  '/getCities',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.getCities
)

router.post(
  '/add/store',
  trimRequest.all,
  authenticateUser(['user']),
  controller.addStore
)

router.get(
  '/get/store',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getStore
)

router.patch(
  '/edit/store',
  trimRequest.all,
  authenticateUser(['user']),
  controller.editStore
)

router.post(
  '/delete/store',
  trimRequest.all,
  authenticateUser(['user']),
  controller.deleteStore
)

router.get('/get/cms/:type', trimRequest.all, controller.getCms)

router.get('/get/about/us/other', trimRequest.all, controller.getAboutUsOther)

router.get('/get/about/us/by/:id', trimRequest.all, controller.getAboutUsById)

router.get(
  '/get/emails',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getEmails
)

router.post(
  '/add/emails',
  trimRequest.all,
  authenticateUser(['user']),
  controller.addEmails
)

router.get('/get/car/details', trimRequest.all, controller.getCarDetails)

router.post(
  '/update/destroy/email',
  trimRequest.all,
  authenticateUser(['user']),
  controller.updateDestroyEmail
)
router.post(
  '/confirm-email',
  trimRequest.all,
  authenticateUser(['user']),
  controller.confirmSecondaryEmail
)

router.post(
  '/client',
  trimRequest.all,
  authenticateUser(['user']),
  controller.client
)

router.get(
  '/get/client',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getClient
)

router.post('/download/csv', trimRequest.all, controller.downloadCsv)

router.post(
  '/invoice',
  trimRequest.all,
  authenticateUser(['user']),
  controller.invoice
)

router.post(
  '/quote',
  authenticateUser(['user']),
  trimRequest.all,
  controller.quote
)

router.post('/addContactUs', trimRequest.all, controller.addContactUs)

router.get('/get/faqs', trimRequest.all, controller.getFaqs)

router.post('/subscription', trimRequest.all, controller.subscription)

router.get('/get/subscription', trimRequest.all, controller.getSubscription)

router.get('/user/features', trimRequest.all, controller.userFeatures)

router.post(
  '/free/quotes',
  trimRequest.all,
  authenticateUser(['user']),
  controller.freeQuotes
)

router.post(
  '/calendar',
  trimRequest.all,
  authenticateUser(['user']),
  controller.calendar
)
//  new ===========apis

router.post(
  '/addcarWithlogo',
  trimRequest.all,
  authenticateUser(['user']),
  controller.addcarWithlogo
)

router.post(
  '/createinsuredPerson',
  trimRequest.all,
  authenticateUser(['user']),
  controller.createinsuredPerson
)

router.post(
  '/sendEmailtoUser',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.sendEmailtoUser
)

router.post(
  '/createservices',
  trimRequest.all,
  authenticateUser(['user']),
  controller.createservices
)

router.get(
  '/getservices',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getservices
)

router.post(
  '/add/fcm/token',
  trimRequest.all,
  authenticateUser(['user']),
  controller.addFcmToken
)

router.post(
  '/remove/fcm/token',
  trimRequest.all,
  authenticateUser(['user']),
  controller.removeFcmToken
)

router.get(
  '/getnotifications',
  trimRequest.all,
  authenticateUser(['user']),
  controller.getnotifications
)

router.post(
  '/createnotifications',
  trimRequest.all,
  authenticateUser(['user']),
  controller.createnotifications
)

router.delete(
  '/deletenotification',
  trimRequest.all,
  authenticateUser(['user']),
  controller.deletenotification
)

router.post(
  '/downloadCmsCsv',
  trimRequest.all,
  authenticateUser(['user']),
  controller.downloadCmsCsv
)

router.post(
  '/freeinvoice',
  trimRequest.all,
  authenticateUser(['user']),
  controller.freeinvoice
)

router.delete(
  '/deleteuser',
  trimRequest.all,
  authenticateUser(['user']),
  controller.deleteuser
)

router.put(
  '/updatestatus/:id',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.updatestatus
)

router.get(
  '/GRAPHAPI',
  trimRequest.all,
  authenticateUser(['user']),
  controller.GRAPHAPI
)

router.post(
  '/uploadClientBulk',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.uploadSchoolBulk
)

router.post(
  '/uploadexcel',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.uploadexcel
)

router.patch(
  '/updateNotification',
  trimRequest.all,
  authenticateUser(['user']),
  controller.updateNotification
)

router.get(
  '/dashboardgraphapi',
  trimRequest.all,
  authenticateUser(['user']),
  controller.dashboardgraphapi
)

router.get(
  '/dashboardgraphapibyHour',
  trimRequest.all,
  authenticateUser(['user']),
  controller.dashboardgraphapibyHour
)

router.get(
  '/downloadsclients',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.downloadsclients
)

router.put(
  '/updateClient/:id',
  trimRequest.all,
  // authenticateUser(["user"]),
  controller.updateClient
)
router.post(
  '/todo',
  authenticateUser(['user']),
  trimRequest.all,
  controller.addTodo
)
router.get(
  '/todo',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getTodos
)
router.put(
  '/todo/:id',
  authenticateUser(['user']),
  trimRequest.all,
  controller.updateStatus
)
router.delete(
  '/todo/:id',
  authenticateUser(['user']),
  trimRequest.all,
  controller.deleteTodo
)
router.get(
  '/clients-cars/:id',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getClientsCars
)
router.get(
  '/upcoming-appointments',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getUpcomingAppointments
)
router.get(
  '/top-clients',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getTopClients
)
router.get(
  '/free-quotes/:id',
  authenticateUser(['user']),
  trimRequest.all,
  controller.viewQuotation
)

router.post('/createduplicate', trimRequest.all, controller.createduplicate)
router.get(
  '/invoice-analytics',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getInvoiceDataByType
)
router.get(
  '/invoice-revenue',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getInvoiceTotalByType
)
router.get(
  '/unpaid-invoice',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getInvoiceUnpaid
)
router.post('/recordpayment/:id', trimRequest.all, controller.recordpayment)
router.get(
  '/all-invoices',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getAllInvoices
)
router.get(
  '/free-invoices',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getFreeInvoices
)
router.get(
  '/outstanding-balances',
  authenticateUser(['user']),
  trimRequest.all,
  controller.getOutstandingBalances
)
router.post(
  '/send-email-invoice',
  authenticateUser(['user']),
  trimRequest.all,
  controller.sendInvoiceToUser
)
router.patch(
  '/update-subuser-status/:id',
  authenticateUser(['user']),
  controller.disableEnabledSubUser
)
router.post('/isEmailExist', controller.checkEmail)
router.post(
  '/check-password',
  authenticateUser(['user']),
  controller.verifyPassword
)
router.post('/resend-otp', authenticateUser(['user']), controller.resendOTP)
router.delete(
  '/delete-secondary-email',
  authenticateUser(['user']),
  controller.deleteSecondaryEmail
)
router.patch('/confirm-appointment/:id', controller.confirm_appointment)
router.patch('/reschedule-appointment/:id', controller.reschedule_appointment)
router.get('/get-customers-list/:id', controller.getCustomerList)
router.get('/customer-list-xlx/:id', controller.getCustomerListExcel)
router.get('/customer-list-csv/:id', controller.getCustomerListCSV)
router.get('/repairs-list/:id', controller.getRepiarList)
router.get('/download-invoiceList/:id', controller.downloadInvoiceList)
router.post(
  '/send-reminder/:id',
  authenticateUser(['user']),
  controller.sendRemainder
)
router.post(
  '/send-email-reminder',
  authenticateUser(['user']),
  controller.sendReminderEmail
)
router.get(
  '/email-follow-up',
  authenticateUser(['user']),
  controller.getAllFollowUpEmails
)
router.get(
  '/total-repair-list',
  authenticateUser(['user', 'body_repairer']),
  controller.getAllRepairs
)
router.get(
  '/email-follow-up/:id',
  authenticateUser(['user']),
  controller.getSingleFollowUpEmail
)
router.post(
  '/add-car-model',
  authenticateUser(['user']),
  controller.addCarModel
)
router.post('/validate-user', controller.checkEmailAndPassword)
router.post('/charge-card', controller.chargePayment)
router.post('/confirm-payment', controller.confirm_Payment)
router.get('/get-cards', authenticateUser(['user']), controller.getCards)
router.delete(
  '/remove-card/:id',
  authenticateUser(['user']),
  controller.removeCard
)
router.post('/add-card', authenticateUser(['user']), controller.addCard)
router.post(
  '/process-payment',
  authenticateUser(['user']),
  controller.processPayment
)
// router.all("/webhook",controller.trackPayment);
router.patch(
  '/update-profile',
  authenticateUser(['user']),
  controller.updateProfile
)
router.post('/add-clicks', controller.addClicks)
router.post(
  '/add-newcar-model',
  authenticateUser(['user']),
  controller.addCarModelBYUser
)
router.post(
  '/add-contactUs-user',
  authenticateUser(['user']),
  controller.addAppContactUs
)
router.post(
  '/add-new-car',
  authenticateUser(['user']),
  controller.addCarAndModel
)
router.post(
  '/invoice-card-payment',
  authenticateUser(['user']),
  controller.garagePayment
)
router.post(
  '/update-invoice',
  authenticateUser(['user']),
  controller.updatePaymentInvoice
)
router.get('/invoice/download/:id', controller.downloadSingleInvoice)
router.get(
  '/invoices/data',
  authenticateUser(['user']),
  controller.getInvoiceData
)
router.patch(
  '/approve-invoice-draft/:id',
  authenticateUser(['user']),
  controller.approveInvoiceDraft
)
router.delete(
  '/delete/invoice/:id',
  authenticateUser(['user']),
  controller.deleteInvoice
)
router.patch('/add-fcm-token', controller.add_fcm_token)
router.get('/vat-list', authenticateUser(['user']), controller.getVatList)
router.get('/schedule-info/:id', controller.getAppointmentInfo)
router.delete(
  '/subuser/:id',
  authenticateUser(['user']),
  controller.deleteSubUser
)
router.get(
  '/get/quoation/:id',
  authenticateUser(['user']),
  controller.findQuotation
)
router.get(
  '/invoice/details/:id',
  authenticateUser(['user']),
  controller.getInvoiceDetails
)

// new

router.post("/send-review/:id", authenticateUser(["user"]), controller.sendReview)
router.post("/cancel-appointment/:id", authenticateUser(["user"]), controller.cancelAppointment)
router.post("/send-quote-nofifications/:id", authenticateUser(["user"]), controller.sendQuoteNotifications)
router.post("/send-maintenance-notifications/:id", authenticateUser(["user"]), controller.regularMaintenanceNotifications)


module.exports = router
