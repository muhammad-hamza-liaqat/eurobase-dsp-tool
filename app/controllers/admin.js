const {
  handleError,
  buildErrObject,
  getCountryCode,
  getIP,
  itemNotFound,
  // sendPushNotification,
} = require("../middleware/utils");
const { sendPushNotification } = require("../../config/firebase");
const {
  createItem,
  createManyItems,
  getItemThroughId,
  updateItemThroughId,
  updateItem,
  updateItems,
  getItemCustom,
  getItemsCustom,
  deleteItem,
  deleteMany,
  aggregateCollection,
} = require("../shared/core");
const {
  uploadFile,
  capitalizeFirstLetter,
  convertToObjectIds,
  automatedString,
  createSlug,
  generatePassword,
} = require("../shared/helpers");
const VatModel = require("../models/VatModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { checkPassword } = require("../middleware/auth");
const db = require("../middleware/admin_db");
const { lookup } = require("geoip-lite");
const countries = require("country-state-city").Country;
const states = require("country-state-city").State;
const cities = require("country-state-city").City;
var moment = require("moment");
const FcmDevice = require("../models/fcm_devices");
const ClickModel = require("../models/click");
const AppInvoiceModel = require("../models/appInvoice");
const RequestModel = require("../models/requestManagement");
const insurence = require("../models/insurence");
const STORAGE_PATH_HTTP = process.env.STORAGE_PATH_HTTP;
const STORAGE_PATH = process.env.STORAGE_PATH;
var mongoose = require("mongoose");
const uuid = require("uuid");
const APP_NAME = process.env.APP_NAME;
const notifications = require("../models/notification");
const CC = require("currency-converter-lt");
const bcrypt = require("bcrypt-nodejs");
let currencyConverter = new CC();
require("../../config/passport");
const passport = require("passport");
const requireAuth = passport.authenticate("jwt", {
  session: false,
});

const { GET, POST } = require("../middleware/axios");

// PDF
// const fs = require("fs");
const ejs = require("ejs");
const fs = require("fs");
var pdf = require("html-pdf");
var mime = require("mime-types");
var path = require("path");
// const cron = require("node-cron");

/********************
 ******  MODEL ******
 ********************/
const carlogos = require("../models/carlogos");
const carmodel = require("../models/carmodel");
const Admin = require("../models/admin");
const CMS = require("../models/cms");
const Faq = require("../models/faq");
const User = require("../models/user");
const FaqTopic = require("../models/faq_topic");
const AboutUsOther = require("../models/about_us_other");
const Store = require("../models/store");
const Sub_user = require("../models/sub_user");
const Car = require("../models/cars");
const ContactUs = require("../models/contact_us");
const Subscription = require("../models/subscription");
const UserFeature = require("../models/user_feature");
const emailer = require("../middleware/emailer");

exports._sendNotification = async (data) => {
  if (data.type) {
    await User.findOne({
      _id: data?.receiver_id,
    })
      .then(
        async (senderDetail) => {
          if (senderDetail) {
            let title;
            let notificationObj = {
              sender_id: data.sender_id,
              receiver_id: data.receiver_id,
              type: data.type,
              notification_type: data.notification_type,
              description: data.description,
              typeId: data.typeId,
            };
            if (data.type == "bookings") {
              description = data.description;
              title = data.title;
            } else if (data.type === "create_account") {
              title = "Account Created";
            } else if (data.type == "approval") {
              description = "Booking Genrated";
              title = "Booking Generated";
            } else if (data.type == "disapproved") {
              title = "Booking Cancel";
              description = `Booking Cancelled!`;
            } else if (data.type == "create_booking") {
              title = "Booking Cancel";
              description = `Booking Cancelled!`;
            } else if (data.type == "create_service") {
              title = "Service Created";
              description = `Service Created!`;
            } else if (data.type == "cancelled") {
              title = "Booking Cancel";
              description = `Booking Cancelled!`;
            } else if (data.type == "rejected") {
              title = "Booking rejected";
              description = `Booking Rejected!`;
            } else if (data.type === "car") {
              notificationObj.title = data.title;
              notificationObj.objectName = data.objectName;
            } else if (data.type === "Permission Request") {
              notificationObj.title = data.title;
            } else {
              title = data.title;
              description = data.description;
            }
            if (data.value_id) {
              notificationObj.value_id = data.value_id;
            }
            try {
              if (data.create_admin) {
                notificationObj.is_admin = true;
                notificationObj.notification_type = notificationObj.type;
                console.log(notificationObj);
                await createItem(notifications, notificationObj);
              } else {
                console.log(notificationObj);
                await createItem(notifications, notificationObj);
              }
              if (data.create) {
                // * create in db
                delete data.create;
              }
            } catch (err) {
              console.log("main err: ", err);
            }

            const findUser = await User.findOne({
              _id: data.receiver_id,
            });
            console.log(findUser);
            const fcmTokens =
              findUser?.fcmTokens.map((item) => item.token) || [];
            console.log(fcmTokens);
            if (fcmTokens.length > 0) {
              try {
                fcmTokens.map(
                  async (item) =>
                    await sendPushNotification(
                      item,
                      notificationObj.title,
                      notificationObj.description
                    )
                );
              } catch (e) {
                console.log(e, "error");
              }
            }
          } else {
            throw buildErrObject(422, "sender detail is null");
          }
        },
        (error) => {
          throw buildErrObject(422, error);
        }
      )
      .catch((err) => {
        console.log("err: ", err);
      });
  } else {
    throw buildErrObject(422, "--* no type *--");
  }
};
exports.formatNumber = (number) => {
  if (number < 1000) {
    return number.toString();
  } else if (number < 1000000) {
    return (number / 1000).toFixed(1) + "k";
  } else if (number < 1000000000) {
    return (number / 1000000).toFixed(1) + "m";
  } else {
    return (number / 1000000000).toFixed(1) + "b";
  }
};

/********************
 * Public functions *
 ********************/

const findUser = async (email) => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email,
      },
      "password loginAttempts blockExpires first_name last_name",
      (err, item) => {
        utils.itemNotFound(err, item, reject, "email not found");
        resolve(item);
      }
    );
  });
};

const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password;
    user.save((err, item) => {
      itemNotFound(err, item, reject, "NOT_FOUND");
      resolve(item);
    });
  });
};

exports.uploadAdminMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR PATH MISSING",
      });
    }
    let media = await uploadFile({
      file: req.files.media,
      path: `${STORAGE_PATH}/${req.body.path}`,
    });
    const mimeType = mime.lookup(media);
    let mediaurl = `${STORAGE_PATH_HTTP}/${req.body.path}/${media}`;
    return res.status(200).json({
      code: 200,
      media,
      mimeType,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const item = await getItemThroughId(Admin, req.user._id, true);
    return res.status(200).json(item);
  } catch (error) {
    console.log(error);
    handleError(res, error);
  }
};

exports.editAdminProfile = async (req, res) => {
  try {
    const item = await updateItemThroughId(Admin, req.user._id, req.body);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.matchOldPassword = async (req, res) => {
  try {
    const admin = await getItemThroughId(Admin, req.user._id, true, "password");
    const doesPasswordMatch = await checkPassword(
      req.body.old_password,
      admin.data.password
    );
    return res.status(200).json(doesPasswordMatch);
  } catch (error) {
    handleError(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    let admin = await getItemThroughId(Admin, req.user._id, true);
    admin = admin.data;
    admin.password = req.body.password;
    admin.save();
    return res.status(200).json({
      code: 200,
      message: "Password Updated",
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getCms = async (req, res) => {
  try {
    const item = await getItemCustom(CMS, { type: req.params.type });
    return res.status(200).json({ code: 200, item });
  } catch (error) {
    handleError(res, error);
  }
};

exports.updateCms = async (req, res) => {
  try {
    const data = req.body;
    let response;
    if (data.type == "privacy_policy") {
      await updateItem(CMS, { _id: "64cc96de10d9672a0b69a2aa" }, data);
      response = "privacy_policy updated";
    }
    if (data.type == "terms") {
      await updateItem(CMS, { _id: "64cc96de10d9672a0b69a1aa" }, data);
      response = "terms & condition updated";
    }
    if (data.type == "about") {
      await updateItem(CMS, { _id: "64d4841c2a3478d3370be4f1" }, data);
      response = "about us updated";
    }
    res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.addFaqTopic = async (req, res) => {
  try {
    const item = await createItem(FaqTopic, req.body);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getFaqTopics = async (req, res) => {
  try {
    let data = req.query;
    const item = await db.getFaqTopics(FaqTopic, data);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getFaqTopicDetails = async (req, res) => {
  try {
    const item = await getItemThroughId(FaqTopic, req.params.topic_id);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.updateFaqTopic = async (req, res) => {
  try {
    const item = await updateItemThroughId(
      FaqTopic,
      req.params.topic_id,
      req.body
    );
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteFaqTopic = async (req, res) => {
  try {
    const item = await deleteItem(FaqTopic, req.params.topic_id);
    await deleteMany(Faq, {
      topic_id: mongoose.Types.ObjectId(req.params.topic_id),
    });
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.addFaq = async (req, res) => {
  try {
    const response = await createItem(Faq, req.body);
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getFaqs = async (req, res) => {
  try {
    let data = req.query;
    const response = await getItemsCustom(Faq, data, undefined, undefined, {
      createdAt: -1,
    });
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getFaqDetails = async (req, res) => {
  try {
    const response = await getItemThroughId(Faq, req.params.faq_id);
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const response = await updateItemThroughId(
      Faq,
      req.params.faq_id,
      req.body
    );
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const response = await deleteItem(Faq, req.params.faq_id);
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getUsers = async (req, res) => {
  try {
    let data = req.query;
    const item = await db.getUsers(User, data);

    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const item = await getItemThroughId(User, req.params.user_id);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.addWalkThrough = async (req, res) => {
  try {
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.resetForgotPassword = async (req, res) => {
  try {
    const data = req.body;
    // const forgotPassword = await findForgotPassword(data.verification)
    const user = await findUser(data.email);
    await updatePassword(data.password, user);
    // const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json({ code: 200, status: "password updated" });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.addStore = async (req, res) => {
  try {
    const data = req.body;
    data.admin_id = req.user._id;

    const checkEmail = await getItemCustom(Store, { email: data.email });
    if (checkEmail.data == null) {
      const store = await createItem(Store, data);
      res.status(200).json({ code: 200, store });
    } else {
      throw buildErrObject(422, "email already exists");
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getStore = async (req, res) => {
  // try {
  //   const data = req.query;
  //   console.log(data);
  //   let stores;
  //   data.admin_id = req.user._id;
  //   if (data.id) {
  //     console.log("<><><<><><><><><");
  //     stores = await getItemCustom(
  //       Store,
  //       { _id: data.id, admin_id: data.admin_id },
  //       undefined,
  //       undefined
  //     );
  //   } else {
  //     data.offset ? +data.offset : 0;
  //     data.limit ? +data.limit : 10;
  //     stores = await getItemsCustom(
  //       Store,
  //       data,
  //       undefined,
  //       undefined,
  //       { createdAt: -1 },
  //       data.limit,
  //       data.offset
  //     );
  //   }
  //   res.status(200).json({ code: 200, stores });
  // } catch (error) {
  //   handleError(res, error);
  // }
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;

    const sort = req.query.sort === "asc" ? 1 : -1;

    const status = req.query.status;
    const search = req.query.search;

    const regexSearch = new RegExp(search, "i");

    const filters = {
      ...(status && { status: status }),
      $or: [
        { first_name: { $regex: regexSearch } },
        { last_name: { $regex: regexSearch } },
        { company_name: { $regex: regexSearch } },
      ],
    };

    const totalItems = await User.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const store = await User.find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        items: store,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
    });
  }
};
exports.getStoreById = async (req, res) => {
  try {
    const data = await User.findOne(
      { _id: req.params.id },
      { decoded_password: 0 }
    );
    return res.status(200).json({
      code: 200,
      data: data,
    });
  } catch (error) {
    return res.status(200).json({
      code: 500,
      status_message: "Internal Server Error",
      message: error.message,
    });
  }
};
exports.editStore = async (req, res) => {
  try {
    const data = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ code: 200, status: "profile updated", data: data });
  } catch (error) {
    handleError(res, error);
  }
};
exports.updateStoreStatus = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });
    const status = user.status === "active" ? "inactive" : "active";
    const data = await User.findOneAndUpdate(
      { _id: req.params.id },
      { status: status },
      { new: true }
    );
    return res.status(200).json({ code: 200, data: data });
  } catch (error) {
    return res.status(200).json({
      code: 500,
      error: error.message,
      message: "internal server error",
    });
  }
};
exports.deleteStore = async (req, res) => {
  try {
    const data = await User.findOneAndDelete(
      { _id: req.params.id },
      { new: true }
    );
    return res.status(200).json({ code: 200, data: null });
  } catch (error) {
    handleError(res, error);
  }
};

exports.uploadUserMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR PATH MISSING",
      });
    }
    let media = await uploadFile({
      file: req.files.media,
      path: `${STORAGE_PATH}/${req.body.path}`,
    });
    let mediaurl = `${STORAGE_PATH_HTTP}/${req.body.path}/${media}`;

    const mimeType = mime.lookup(media);

    return res.status(200).json({
      code: 200,
      path: mediaurl,
      mimeType: mimeType,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.testApi = async (req, res) => {
  try {
    res.status(200).json({ code: 200, status: "ok tested" });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.createSubUser = async (req, res) => {
  try {
    const data = req.body;
    const generate_password = await generatePassword(10);
    data.password = generate_password;
    data.user_id = data.store_id;
    const response = await Sub_user.create(data);
    await emailer.sendPasswordToSubUser(
      req.getLocale(),
      {
        to: data.email,
        name: `${data.first_name} ${data.last_name}`,
        userHasAccessToQuote: data?.quote,
        userHasAccessToCalendar: data?.access_the_calendar,
        userHasAccessToWorkshopSchedule: data?.access_the_workshop_schedule,
        userHasAccessToChangePrices: data?.change_prices,
        userHasAccessToInvoices: data?.make_invoices,
        userHasAccessToCreateCustomers: data?.create_customers,
        userHasAccessToCreateRepairOrder: data?.create_repair_order,
        password: generate_password,
        subject: "Eurobose Invitation",
        email: data.email,
        logo: process.env.LOGO,
        link: process.env.App_Url,
      },
      "sendPasswordToSubUser"
    );

    res.status(200).json({ code: 200, user: response });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.editSubUser = async (req, res) => {
  try {
    const subusers = await Sub_user.findById(req.params.id);
    if (!subusers) {
      return res.status(404).json({ code: 404, message: "Subuser not found" });
    }
    const data = await Sub_user.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    return res.status(200).json({
      code: 200,
      message: "sub users updated successfully",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.deleteSubUsers = async (req, res) => {
  try {
    await Sub_user.findByIdAndDelete(req.params.id);
    return res.status(200).json({ code: 200, message: "Delete Successfully" });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.getSingleSubUser = async (req, res) => {
  try {
    const subusers = await Sub_user.findById(req.params.id);
    if (!subusers) {
      return res.status(404).json({ code: 404, message: "subuser not found" });
    }
    return res.status(200).json({
      code: 200,
      message: "sub users updated successfully",
      data: subusers,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "internal server error",
      error: error.message,
    });
  }
};

exports.aboutUsOther = async (req, res) => {
  try {
    const item = await createItem(AboutUsOther, req.body);
    return res.status(200).json({ code: 200, item });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAboutUsOther = async (req, res) => {
  try {
    const data = req.query;
    let condition = {};
    if (data.type) condition.type = data.type;
    const response = await getItemsCustom(
      AboutUsOther,
      condition,
      undefined,
      undefined,
      { createdAt: -1 }
    );
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAboutUsById = async (req, res) => {
  try {
    const response = await getItemCustom(AboutUsOther, { _id: req.params.id });
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.editAboutUs = async (req, res) => {
  try {
    const response = await updateItemThroughId(
      AboutUsOther,
      req.params.id,
      req.body
    );
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteAboutUs = async (req, res) => {
  try {
    const response = await deleteItem(AboutUsOther, req.params.id);
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.viewUserDetail = async (req, res) => {
  try {
    const response = await getItemCustom(Sub_user, { _id: req.params.id });
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.addCarDetails = async (req, res) => {
  try {
    const data = req.body;
    return res
      .status(200)
      .json({ code: 200, response: await createItem(Car, data) });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getCarDetails = async (req, res) => {
  try {
    const response = await getItemsCustom(
      Car,
      undefined,
      undefined,
      undefined,
      { createdAt: -1 }
    );
    return res.status(200).json({ code: 200, response });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getContactUs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;
    const sort = req.query.sort === "asc" ? 1 : -1;
    const status = req.query.status;
    const search = req.query.search;
    const regexSearch = new RegExp(search, "i");
    const filters = {
      ...(status && { status: status }),
      $or: [
        { first_name: { $regex: regexSearch } },
        { last_name: { $regex: regexSearch } },
      ],
    };

    const totalItems = await ContactUs.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const contacts = await ContactUs.find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        item: contacts,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getSingleContactUs = async (req, res) => {
  try {
    const data = await ContactUs.findOne({
      _id: req.params.id,
    });
    return res.status(200).json({ code: 200, data: data });
  } catch (error) {
    handleError(res, error);
  }
};
exports.deleteContactUs = async (req, res) => {
  try {
    const item = await deleteItem(ContactUs, req.params._id);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.addContactUs = async (req, res) => {
  try {
    const data = req.body;
    if (req.headers.authorization) {
      requireAuth();
      data.userId = req.user._id;
    }
    const item = await createItem(ContactUs, data);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.updateContactUs = async (req, res) => {
  try {
    return res.status(200).json({
      code: 200,
      response: await updateItemThroughId(ContactUs, req.params._id, req.body),
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.sendReplyToContactUsUser = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(200).send({
        message: "id does not exist",
      });
    }
    const data = await ContactUs.findOne({ _id: req.params.id });

    await emailer.sendReply(
      req.getLocale(),
      {
        to: data?.email,
        name: `${data.first_name} ${data.last_name}`,
        subject: `Reply for your query from ${process.env.APP_NAME} `,
        email: data?.email,
        message: req.body.message,
        appName: process.env.APP_NAME,
      },
      "/admin/sendReplyToUser"
    );
    await ContactUs.findOneAndUpdate(
      { _id: req.params.id },
      { reply: req.body.message, status: "complete" }
    );
    return res.status(200).send({ message: "Email sent successfully" });
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: `Failed to send email: ${error.message}`,
    });
  }
};

exports.subscription = async (req, res) => {
  try {
    return res.status(200).json({
      code: 200,
      response: await db.subscription(Subscription, req.body),
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.garageUser = async (req, res) => {
  try {
    return res
      .status(200)
      .json({ code: 200, response: await db.garageUser(User, req.body) });
  } catch (error) {
    handleError(res, error);
  }
};

exports.userFeatures = async (req, res) => {
  try {
    return res.status(200).json({
      code: 200,
      response: await db.userFeatures(UserFeature, req.body),
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const data = req.body;
    let admin = await getItemThroughId(Admin, data.id);
    const isPasswordMatch = await db.checkPassword(
      data.oldpassword,
      admin.data
    );
    if (!isPasswordMatch) {
      throw buildErrObject(422, `Please enter valid old password`);
    } else {
      var result = await db.changeNewPassword(
        data.oldpassword,
        data.password,
        admin.data
      );
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
};

exports.addcarWithlogo = async (req, res) => {
  try {
    const item = await createItem(carlogos, req.body);
    return res.status(200).json(item);
  } catch (error) {
    handleError(res, error);
  }
};

exports.addCategory = async (req, res) => {
  try {
    const data = req.body;
    let category;
    if (!data.parent_id) {
      const findtoplevelcategory = await carlogos.findOne({
        main_title: data.main_title,
        category_title: data.category_title,
      });

      if (findtoplevelcategory) {
        throw buildErrObject(422, "Already_Added_category");
      } else {
        data.parent_id = null;
        category = new carlogos({
          main_title: data.main_title,
          carmodel: data.carmodel,
          category_title: data.category_title,
          logo: data.logo,
        });
        await category.save();
      }
    } else {
      if (data.main_title) {
        data.parent_id = null;
        category = new carlogos({
          main_title: data.main_title,
          parent_id: null,
        });
        await category.save();
      }
      category = await carlogos.findById(
        data.main_title ? category._id : data.parent_id
      );
    }

    if (typeof data.sub_category == "string") {
      data.sub_category = JSON.parse(data.sub_category);
    }
    let parentCategory;

    if (data.sub_category) {
      for (const x of data.sub_category) {
        const sub_category = {
          main_title: x.main_title,
          parent_id: category._id,
          logo: x.logo,
        };

        const findtoplevelcategoryforparent_id = await carlogos.findOne({
          parent_id: data.parent_id,
          main_title: x.main_title,
        });
        if (findtoplevelcategoryforparent_id) {
          throw buildErrObject(422, "Already_Added_category");
        }

        let subCategory = new carlogos(sub_category);
        await subCategory.save();

        parentCategory = await carlogos.findById(category._id);
        parentCategory.subCategories.push(subCategory._id);
        await parentCategory.save();
      }
      return res.status(200).json({
        code: 200,
        data: parentCategory,
      });
    } else {
      return res.status(200).json({
        code: 200,
        data: category,
      });
    }
  } catch (error) {
    handleError(res, error);
  }
};

exports.editcarmodel = async (req, res) => {
  try {
    const data = await carlogos.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    return res.status(200).json({ code: 200, response: data });
  } catch (error) {
    handleError(res, error);
  }
};

exports.findallcarlogos = async (req, res) => {
  try {
    const data = req.query;
    const limit = data.limit ? parseInt(data.limit) : 100;
    const offset = data.offset ? parseInt(data.offset) : 0;
    let parent_artForm, subcategory;
    const subcategoryIds = data._id;
    let cndition = {};
    if (data.id) {
      cndition = {
        _id: data.id,
      };
    }

    const groupedSubcategories = await carlogos.aggregate([
      { $match: cndition },

      {
        $group: {
          _id: "$category_title",
          firstDocument: { $first: "$$ROOT" }, // Push entire document to subcategories array
        },
      },

      { $replaceRoot: { newRoot: "$firstDocument" } },
      {
        $lookup: {
          from: "carlogos",
          localField: "category_title",
          foreignField: "category_title",
          as: "cars",
          // pipeline:[
          //   {$match:{
          //     $ne:"_id"
          //   }}
          // ]
        },
      },
      { $skip: offset },
      { $limit: limit },
    ]);

    subcategory = await carlogos.find(cndition);
    let whereObj = {};
    let results = { ...{ code: 200 }, subcategory: subcategory };
    return res.status(200).json(results);
  } catch (error) {
    handleError(res, error);
  }
};

exports.deletecarmodel = async (req, res) => {
  try {
    await carlogos.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      message: "Delete Successfully",
      data: null,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.addFcmToken = async (req, res) => {
  try {
    const data = req.body;
    let response;
    data.user_id = req.user._id;
    const device = await getItemCustom(FcmDevice, {
      device_id: data.device_id,
    });
    if (device) {
      await FcmDevice.updateOne(
        { device_id: data.device_id },
        { $set: { device_token: data.device_token } }
      );
      response = "updated..";
    } else {
      response = await createItem(FcmDevice, data);
    }
    res.status(200).json({
      code: 200,
      response,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.removeFcmToken = async (req, res) => {
  try {
    const data = req.body;
    data.user_id = req.user._id;
    res.status(200).json({
      code: 200,
      response: await deleteItem(FcmDevice, data.device_id),
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.addinsurence = async (req, res) => {
  try {
    const data = req.body;
    // data.user_id = req.user._id;
    res.status(200).json({
      code: 200,
      response: await createItem(insurence, data),
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getinsurence = async (req, res) => {
  try {
    const data = req.body;
    // data.user_id = req.user._id;

    res.status(200).json({
      code: 200,
      response: await getItemsCustom(
        insurence,
        data,
        undefined,
        undefined,
        { createdAt: -1 },
        data.limit,
        data.offset
      ),
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.editinsurence = async (req, res) => {
  try {
    const data = req.body;
    // data.user_id = req.user._id;

    res.status(200).json({
      code: 200,
      response: await updateItemThroughId(insurence, req.body.id, req.body),
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.getSingleInsurance = async (req, res) => {
  try {
    const insurance = await insurence.findOne({ _id: req.params.id });
    res.status(200).json({
      code: 200,
      response: insurance,
    });
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteinsurence = async (req, res) => {
  try {
    await insurence.findOneAndDelete({ _id: req.params.id });

    res.status(200).json({
      code: 200,
      response: "deleted",
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.updateNotification = async (req, res) => {
  try {
    await Notification.updateMany({ receiver_id: req.user._id });

    res.status(200).json({
      code: 200,
      response: "Updated",
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.adminNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;
    const sort = req.query.sort === "asc" ? 1 : -1;

    const unseenCounts = await notifications.countDocuments({ is_seen: false });
    const totalItems = await notifications.countDocuments();
    const skipCount = (page - 1) * pageSize;

    const data = await notifications
      .find({ receiver_id: req.user._id })
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);
    res.status(200).json({
      code: 200,
      response: {
        data: data,
        totalItems: totalItems,
        unseen_counts: unseenCounts,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.readAllNotifications = async (req, res) => {
  try {
    await notifications.updateMany(
      { receiver_id: req.user._id },
      { $set: { is_seen: true } }
    );
    return res.status(200).json({
      code: 200,
      message: "Read all notifications",
      data: null,
    });
  } catch (error) {}
};
exports.deleteNotifications = async (req, res) => {
  try {
    await notifications.deleteMany({ _id: { $in: req.body.ids } });
    res.status(200).json({
      code: 200,
      response: null,
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.getAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;

    const sort = req.query.sort === "asc" ? 1 : -1;
    const search = req.query.search;
    const status = req.query.status;
    const regexSearch = new RegExp(search, "i");

    const filters = {
      ...(status && { status: status }),
      $or: [
        { main_title: { $regex: regexSearch } },
        { category_title: { $regex: regexSearch } },
      ],
    };
    const totalItems = await carlogos.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const data = await carlogos
      .find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        items: data,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
exports.updateCarStatus = async (req, res) => {
  try {
    const car = await carlogos.findOne({ _id: req.params.id });
    const status = car.status === "active" ? "inactive" : "active";
    const updatedCar = await carlogos.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      { status: status },
      { new: true }
    );
    return res.status(200).send({
      code: 200,
      message: "status has been updated successfully",
      data: updatedCar,
    });
  } catch (error) {
    return res.status(200).json({
      code: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};
exports.getAdminInsurance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;

    const sort = req.query.sort === "asc" ? 1 : -1;
    const search = req.query.search;
    const status = req.query.status;
    const regexSearch = new RegExp(search, "i");

    const filters = {
      ...(status && { status: status }),
      $or: [{ company_name: { $regex: regexSearch } }],
    };

    const totalItems = await insurence.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const data = await insurence
      .find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        items: data,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
};

exports.updateInsuranceStatus = async (req, res) => {
  try {
    const insurance = await insurence.findOne({ _id: req.params.id });
    const status = insurance.status === "active" ? "inactive" : "active";
    const updatedInsurance = await insurence.findOneAndUpdate(
      {
        _id: req.params.id,
      },
      { status: status },
      { new: true }
    );
    return res.status(200).send({
      code: 200,
      message: "status has been updated successfully",
      data: updatedInsurance,
    });
  } catch (error) {
    return res.status(200).json({
      code: 500,
      message: "Internal Server Error",
      error: error,
    });
  }
};
exports.createStore = async (req, res) => {
  try {
    const data = req.body;
    const generatedPassword = await generatePassword(10);

    const isEmailExists = await User.findOne({ email: data.email });
    if (isEmailExists) {
      return res.status(409).send({
        code: 409,
        message: "Email already exists",
      });
    }
    data.password = generatedPassword;
    data.verification_status = true;
    await emailer.sendOtpToUser(
      req.getLocale(),
      {
        to: data?.email,
        name: `${data.first_name} ${data.last_name}`,
        subject: `Login Credentital for ${process.env.APP_NAME} `,
        appLink: `${process.env.App_Url}`,
        email: data?.email,
        generatePassword: generatedPassword,
        appName: process.env.APP_NAME,
      },
      "/admin/addStore"
    );
    const newUser = await User.create(data);
    const response = {
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
    };
    return res.status(201).send({
      code: 201,
      message: "user has been created successfully",
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getSubUSers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;

    const sort = req.query.sort === "asc" ? 1 : -1;

    const status = req.query.status;
    const search = req.query.search;

    const regexSearch = new RegExp(search, "i");

    const filters = {
      user_id: req.params.id,
      ...(status && { is_active: status }),
      $or: [
        { first_name: { $regex: regexSearch } },
        { last_name: { $regex: regexSearch } },
        { email: { $regex: regexSearch } },
      ],
    };

    const totalItems = await Sub_user.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const data = await Sub_user.find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        items: data,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
};
exports.getAllRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;

    const sort = req.query.sort === "asc" ? 1 : -1;

    const status = req.query.status;
    const search = req.query.search;

    const regexSearch = new RegExp(search, "i");

    const filters = {
      user_id: req.params.id,
      ...(status && { is_active: status }),
      $or: [
        { first_name: { $regex: regexSearch } },
        { last_name: { $regex: regexSearch } },
        { email: { $regex: regexSearch } },
      ],
    };

    const totalItems = await RequestModel.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const data = await RequestModel.find(filters)
      .populate("user")
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.status(200).json({
      code: 200,
      data: {
        items: data,
        totalItems: totalItems,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
};
exports.approvedCarModelRequest = async (req, res) => {
  try {
    const request = req.query.request;
    console.log(request, "reeew");
    const requestId = req.body.requestId;
    const requestData = await RequestModel.findById(requestId);
    if (!requestData) {
      return res.status(404).json({ code: 404, message: "requestnot found" });
    }
    if (request === "decline") {
      const data = await RequestModel.findByIdAndUpdate(
        requestId,
        { status: false },
        { new: true }
      );
      return res
        .status(200)
        .send({ code: 200, message: "Successfully created", data: data });
    } else {
      const car = await carlogos.findById(requestData?.requestId);
      if (!car) {
        return res.status(404).send({
          code: 404,
          message: "Car not found",
        });
      }
      if (car.carmodel.includes(requestData?.requestName)) {
        return res.status(400).send({
          code: 400,
          message: "Model already exists in the car's carmodel",
        });
      }
      car.carmodel.push(requestData?.requestName);
      const updatedCar = await car.save();
      let notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: requestData?.user.toString(),
        notification_type: "car",
        type: "car",
        create: true,
        title: "Car Model Addition Approved",
        typeId: req.user._id.toString(),
        description: `Your request to add a new car model has been approved. You can now enjoy the added features of the ${model} in the ${car.main_title}.`,
      };
      const data = await RequestModel.findByIdAndUpdate(
        requestId,
        { status: true },
        { new: true }
      );
      return res
        .status(200)
        .send({ code: 200, message: "Successfully created", data: data });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
};
exports.approvedCarModelRequest = async (req, res) => {
  try {
    const request = req.query.request;
    const requestId = req.body.requestId;
    const requestData = await RequestModel.findById(requestId);
    if (!requestData) {
      return res.status(404).json({ code: 404, message: "requestnot found" });
    }
    if (request === "decline") {
      const data = await RequestModel.findByIdAndUpdate(
        requestId,
        { status: "decline" },
        { new: true }
      );
      return res
        .status(200)
        .send({ code: 200, message: "Successfully created", data: data });
    } else {
      const car = await carlogos.findById(requestData?.requestId);
      if (!car) {
        return res.status(404).send({
          code: 404,
          message: "Car not found",
        });
      }
      if (car.carmodel.includes(requestData?.requestName)) {
        return res.status(400).send({
          code: 400,
          message: "Model already exists in the car's carmodel",
        });
      }
      car.carmodel.push(requestData?.requestName);
      const updatedCar = await car.save();
      let notificationObj = {
        sender_id: req.user._id.toString(),
        receiver_id: requestData?.user.toString(),
        notification_type: "car",
        type: "car",
        create: true,
        title: "Car Model Addition Approved",
        typeId: req.user._id.toString(),
        description: `Your request to add a new car model has been approved. You can now enjoy the added features of the ${requestData?.requestName} in the ${car.main_title}.`,
      };
      await this._sendNotification(notificationObj);
      const data = await RequestModel.findByIdAndUpdate(
        requestId,
        { status: "accept" },
        { new: true }
      );
      return res
        .status(200)
        .send({ code: 200, message: "Successfully created", data: data });
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
};
exports.getTotalUsersData = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const clicks = await ClickModel.find();
    const total_clicks = clicks[0].totalClicks;
    const totalSales = await AppInvoiceModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$paid_amount" },
        },
      },
    ]);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const aggregationResult = await User.aggregate([
      {
        $match: {
          createdAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          count: 1,
        },
      },
    ]);

    console.log(totalSales);
    const currentMonthData = aggregationResult.find(
      (entry) => entry.year === currentYear && entry.month === currentMonth
    ) || { count: 0 };
    const previousMonthData = aggregationResult.find(
      (entry) => entry.year === previousYear && entry.month === previousMonth
    ) || { count: 0 };
    const changeInData = currentMonthData.count - previousMonthData.count;
    const perentageChange = (changeInData / previousMonthData.count) * 100;
    let data = {
      total_users: this.formatNumber(users),
      total_clicks: this.formatNumber(total_clicks),
      sales: this.formatNumber(
        totalSales.length > 0 ? totalSales[0]?.total : 0
      ),
      activeUsersInPercentage: perentageChange.toFixed(2),
      activeUsers: this.formatNumber(changeInData),
    };
    return res.send({ code: 200, data: data });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      error: error.message,
    });
  }
};
exports.numberOfInvoices = async (req, res) => {
  try {
    const invoices = await AppInvoiceModel.aggregate([
      {
        $match: {
          createdAt: { $exists: true },
          $expr: {
            $or: [{ $eq: [{ $year: "$createdAt" }, parseInt(req.query.year)] }],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          monthIndex: "$_id.month",
          count: 1,
        },
      },
    ]);

    const data = {
      months: [
        "Jan",
        "Feb",
        "March",
        "April",
        "May",
        "June",
        "July",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      data: Array(12).fill(0),
    };

    invoices.forEach((invoice) => {
      data.data[invoice.monthIndex - 1] = this.formatNumber(invoice.count);
    });

    return res.send({
      message: "data fetched successfully",
      data: data,
    });
  } catch (error) {}
};
exports.totalSales = async (req, res) => {
  try {
    const invoices = await AppInvoiceModel.aggregate([
      {
        $match: {
          createdAt: { $exists: true },
          $expr: {
            $or: [{ $eq: [{ $year: "$createdAt" }, parseInt(req.query.year)] }],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalSales: { $sum: "$paid_amount" },
        },
      },
      {
        $project: {
          _id: 0,
          monthIndex: "$_id.month",
          totalSales: 1,
        },
      },
    ]);
    const data = {
      months: [
        "Jan",
        "Feb",
        "March",
        "April",
        "May",
        "June",
        "July",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      data: Array(12).fill(0),
    };

    invoices.forEach((invoice) => {
      data.data[invoice.monthIndex - 1] = invoice.totalSales;
    });

    return res.send({
      message: "data fetched successfully",
      data: data,
    });
  } catch (error) {}
};
exports.getTodayData = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      0,
      0,
      0
    );

    const count = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lt: currentDate,
          },
        },
      },
      {
        $count: "userCount",
      },
    ]);

    const userCount = count.length > 0 ? count[0].userCount : 0;
    const sales = await AppInvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lt: currentDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$paid_amount" },
        },
      },
    ]);
    const totalSales = sales[0] ? sales[0].totalSales : 0;
    let data = {
      total_users: userCount,
      // total_clicks: this.formatNumber(total_clicks),
      sales: this.formatNumber(totalSales),
      // activeUsersInPercentage: perentageChange.toFixed(2),
      // activeUsers: this.formatNumber(changeInData),
    };
    return res.send({ code: 200, data: data });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      code: 500,
      error: error.message,
    });
  }
};
exports.getClientCards = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    let data;
    stripe.paymentMethods.list(
      {
        customer: user.stripeCustomerId,
        type: "card",
      },
      (err, paymentMethods) => {
        if (err) {
          console.error("Error retrieving cards:", err.message);
          return;
        }
        data = paymentMethods?.data?.map((item) => {
          return {
            brand: item.card.brand,
            last$: item.card.last4,
            exp_month: item.card.exp_month,
            exp_year: item.card.exp_year,
            type: item.card.funding,
          };
        });
        return res.status(200).json({ code: 200, data: data });
      }
    );
  } catch (e) {
    return res.status(500).json({ code: 500, message: e.message });
  }
};
exports.getClientTransactions = async (req, res) => {
  try {
    const invoices = await AppInvoiceModel.find({ user_id: req.params.id });
    return res.status(200).send({ code: 200, data: invoices });
  } catch (e) {
    return res.status(500).json({ code: 500, message: e.message });
  }
};

exports.getCustomerList = async (req, res) => {
  try {
    const data = await User.find().populate("subscription_plan");

    const contents = fs.readFileSync("./views/en/admin/customer.ejs", "utf8");
    var html = ejs.render(contents, { data });

    const fileName = "customers" + Date.now();
    var options = {
      format: "A4",
      width: "14in",
      orientation: "landscape",
      height: "21in",
      timeout: 540000,
    };
    pdf
      .create(html, options)
      .toFile(
        "public_v1/admin/customersList/" + fileName + ".pdf",
        async function (err, pdfV) {
          if (err) {
            console.log(err);
            return res.status(500).send("Error generating PDF");
          }

          const fullPath =
            process.env.API_URL2 +
            "public_v1/admin/customersList/" +
            fileName +
            ".pdf";

          const filename = path.basename(fullPath);
          const contentType = mime.lookup(fullPath);

          res.setHeader(
            "Content-disposition",
            "attachment; filename=" + filename
          );
          res.setHeader("Content-type", contentType);

          const filestream = fs.createReadStream(pdfV.filename);

          filestream.on("data", () => {
            console.log("reading.....");
          });

          filestream.on("open", function () {
            console.log("Open-------------------->");
            filestream.pipe(res);
          });

          filestream.on("end", () => {
            fs.unlink(pdfV.filename, (err) => {
              if (err) throw err;
              console.log("successfully deleted ", fullPath);
            });
          });

          filestream.on("error", (err) => {
            console.log(err);
            return res.status(500).send("Error reading PDF");
          });

          filestream.on("close", () => {
            console.log("Stream closed now");
          });
        }
      );
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      code: 500,
      message: "internal server error",
    });
  }
};
exports.getInvoiceList = async (req, res) => {
  try {
    const data = await AppInvoiceModel.find().populate("user_id");

    const contents = fs.readFileSync("./views/en/admin/invoice.ejs", "utf8");
    var html = ejs.render(contents, { data });

    const fileName = "customers" + Date.now();
    var options = {
      format: "A4",
      width: "14in",
      orientation: "landscape",
      height: "21in",
      timeout: 540000,
    };
    pdf
      .create(html, options)
      .toFile(
        "public_v1/admin/invoiceList/" + fileName + ".pdf",
        async function (err, pdfV) {
          if (err) {
            console.log(err);
            return res.status(500).send("Error generating PDF");
          }

          const fullPath =
            process.env.API_URL2 +
            "public_v1/admin/invoiceList/" +
            fileName +
            ".pdf";

          const filename = path.basename(fullPath);
          const contentType = mime.lookup(fullPath);

          res.setHeader(
            "Content-disposition",
            "attachment; filename=" + filename
          );
          res.setHeader("Content-type", contentType);

          const filestream = fs.createReadStream(pdfV.filename);

          filestream.on("data", () => {
            console.log("reading.....");
          });

          filestream.on("open", function () {
            console.log("Open-------------------->");
            filestream.pipe(res);
          });

          filestream.on("end", () => {
            fs.unlink(pdfV.filename, (err) => {
              if (err) throw err;
              console.log("successfully deleted ", fullPath);
            });
          });

          filestream.on("error", (err) => {
            console.log(err);
            return res.status(500).send("Error reading PDF");
          });

          filestream.on("close", () => {
            console.log("Stream closed now");
          });
        }
      );
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      code: 500,
      message: "internal server error",
    });
  }
};
exports.sendRequestForLogin = async (req, res) => {
  try {
    let notificationObj = {
      receiver_id: req.params.id,
      sender_id: req.user._id,
      notification_type: "Permission Request",
      create: true,
      type: "Permission Request",
      title: "Account Access Request",
      value_id: req.params.queryId,
      description: `Admin is requesting access to your account. Please review the access request.`,
    };
    await this._sendNotification(notificationObj);
    await ContactUs.findByIdAndUpdate(req.params.queryId, {
      $set: { request: "sent" },
    });
    return res.status(200).json({ code: 200, message: "Request sent" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ code: 500, message: error.message });
  }
};
exports.add_fcm_token = async (req, res) => {
  try {
    const user = await Admin.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ code: 404, message: "Admin not found" });
    }

    const existingTokenIndex = user.fcmTokens.findIndex(
      (token) => token.device_id === req.body.device_id
    );

    if (existingTokenIndex !== -1) {
      user.fcmTokens[existingTokenIndex] = {
        device_id: req.body.device_id,
        token: req.body.token,
        device_type: req.body.device_type,
      };
    } else {
      user.fcmTokens.push({
        device_id: req.body.device_id,
        token: req.body.token,
        device_type: req.body.device_type,
      });
    }

    await user.save();

    return res
      .status(200)
      .json({ code: 200, message: "FCM token added successfully" });
  } catch (error) {
    return res
      .status(500)
      .send({ code: 500, message: "Internal Server Error" });
  }
};
exports.addVat = async (req, res) => {
  try {
    const country = await VatModel.findOne({
      country_name: req.body.country_name.trim(),
    });
    if (country) {
      return res
        .status(409)
        .send({ code: 409, message: "Country name already exists" });
    }
    const data = await VatModel.create(req.body);
    return res.status(200).send({
      code: 200,
      message: "vat has been created successfully",
      data: data,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      code: 500,
      message: "Internal Server Error",
    });
  }
};
exports.getSingleVat = async (req, res) => {
  try {
    const data = await VatModel.findById(req.params.id);
    if (!data) {
      return res.status(404).send({ code: 404, message: "Vat not found" });
    }
    return res.status(200).send({
      code: 200,
      message: "vat has been created successfully",
      data: data,
    });
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: "Internal Server Error",
    });
  }
};
exports.getVatList = async (req, res) => {
  try {
    const sort = req.query.sort === "asc" ? 1 : -1;
    const searchQuery = req.query?.search.trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.limit, 10) || 10;
    const regexSearch = new RegExp(searchQuery, "i");
    const filters = {
      country_name: { $regex: regexSearch },
    };
    const totalItems = await VatModel.countDocuments(filters);

    const skipCount = (page - 1) * pageSize;

    const data = await VatModel.find(filters)
      .sort({ createdAt: sort })
      .skip(skipCount)
      .limit(pageSize);

    return res.send({
      code: 200,
      data: data,
      totalItems: totalItems,
    });
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: "Internal Server Error",
    });
  }
};
exports.deleteVatList = async (req, res) => {
  try {
    await VatModel.findByIdAndDelete(req.params.id);
    return res.status(200).send({ code: 200, message: "successfully deleted" });
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: "Internal Server Error",
    });
  }
};
exports.editVat = async (req, res) => {
  try {
    const vat = await VatModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    return res.status(200).send({
      code: 200,
      data: vat,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ code: 500, message: "Internal Server Error", error });
  }
};