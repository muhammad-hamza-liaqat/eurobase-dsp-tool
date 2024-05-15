const { buildErrObject } = require("../middleware/utils");

const {
  getItemsCustom,
  countDocuments,
  aggregateCollection,
  createItem,
  getItemThroughId,
  updateItemThroughId,
  getItemThroughIdNew,
  updateItem,
  updateItems,
  deleteItem,
  getItemCustom,
  sendNotification,
} = require("../shared/core");

const { convertToObjectIds } = require("../shared/helpers");
const mongoose = require("mongoose");
const moment = require("moment");
const uuid = require("uuid");
const ejs = require("ejs");
// const fs = require("fs");
var pdf = require("html-pdf");
var mime = require("mime-types");
var path = require("path");
var fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const FCMDevice = require("../models/fcm_devices");
const client = require("../models/client");
const emailer = require("./emailer");
const QuoteModel = require("../models/quote");

const sendNotifications = async (obj) => {
  try {
    const devices = await FCMDevice.find({
      user_id: obj.receiver_id,
    });

    for (var i = 0; i < devices.length; i++) {
      const val = devices[i];
      const token = val.token;
      // See documentation on defining a message payload.
      var message = {
        // notification: {
        //   title : obj.title,
        //   body : obj.body,
        //   image : val.image ? val.image : "",
        // },
        data: obj,
        token: token,
      };

      // Send a message to devices subscribed to the combination of topics
      // specified by the provided condition.

      admin
        .messaging()
        .send(message)
        .then((response) => {
          // Response is a message ID string.
        })
        .catch((error) => {
          console.log("Error sending message:", error);
        });
    }
  } catch (err) {
    console.log("Error in FCM: ", err);
  }
};

module.exports = {
  async getCms(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemCustom(
          collection,
          { type: data.type },
          "content title updatedAt"
        );
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getLanguages(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };
        if (data.search && data.search != "undefined") {
          condition.language = new RegExp(data.search, "i");
        }

        const agg = [];

        if (data.from_filtered) {
          agg.push(
            /*{
              $lookup: {
                from: 'users',
                let: {
                  language_id: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and : [
                          
                          {
                            $in: ["$$language_id", "$languages.language_id" ]
                          }
                        ]
                      },
                    },
                  },
                  {
                    $limit: 1
                  }
                ],
                as: "professional_languages"
              }
            }*/
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "languages.language_id",
                as: "availabe_languages",
              },
            }
          );

          condition["availabe_languages.0"] = { $exists: true };
        }

        agg.push({
          $match: condition,
        });
        agg.push({
          $project: {
            availabe_languages: 0,
          },
        });

        const item = await aggregateCollection(collection, agg);

        /*const item = await getItemsCustom(collection,
          condition,
          '_id language'
        );*/
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getSkills(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };
        if (data.occupation_id && data.occupation_id != "undefined") {
          condition.occupation_id = mongoose.Types.ObjectId(data.occupation_id);
        }
        if (data.sub_occupation_id && data.sub_occupation_id != "undefined") {
          if (data.sub_occupation_id.includes(",")) {
            condition.sub_occupation_id = {
              $in: await convertToObjectIds(data.sub_occupation_id.split(",")),
            };
          } else {
            condition.sub_occupation_id = mongoose.Types.ObjectId(
              data.sub_occupation_id
            );
          }
        }

        if (data.service_sub_category_id) {
          condition.service_sub_category_id = data.service_sub_category_id;
        }

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(
          collection,
          condition,
          "_id name service_sub_category_id"
        );
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProfessionalProfile(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let profile = await aggregateCollection(collection, [
          {
            $match: {
              _id: data.user_id,
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "company_details.country",
              foreignField: "_id",
              as: "company_country",
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "address.country_id",
              foreignField: "_id",
              as: "address_country",
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "tax_residence.country",
              foreignField: "_id",
              as: "taxResidence_country",
            },
          },
          {
            $unwind: {
              path: "$taxResidence_country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$company_country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$address_country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "company_details.industry_id",
              foreignField: "_id",
              as: "company_industry",
            },
          },
          {
            $unwind: {
              path: "$company_industry",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "securityquestions",
              localField: "security_question.security_question_id",
              foreignField: "_id",
              as: "security_question.question",
            },
          },
          {
            $unwind: {
              path: "$security_question.question",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              password: 0,
              verification: 0,
              verified: 0,
              loc: 0,
              loginAttempts: 0,
              email_verified_at: 0,
              email_OTP: 0,
              phone_OTP: 0,
            },
          },
        ]);
        profile.data = profile.data.length > 0 ? profile.data[0] : null;
        resolve(profile);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProfesionalDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let profile = await aggregateCollection(collection, [
          {
            $match: {
              _id: mongoose.Types.ObjectId(data.professional_id),
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "company_details.country",
              foreignField: "_id",
              as: "company_country",
            },
          },
          {
            $unwind: {
              path: "$company_country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "company_details.industry_id",
              foreignField: "_id",
              as: "company_industry",
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "services.service_id",
              foreignField: "_id",
              as: "service_details",
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "services.service_category_id",
              foreignField: "_id",
              as: "service_category_details",
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "services.service_sub_category_id",
              foreignField: "_id",
              as: "service_sub_category_details",
            },
          },
          // {
          //   $unwind: {
          //     path: "$service_sub_category_details",
          //     preserveNullAndEmptyArrays: true,
          //   },
          // },
          {
            $unwind: {
              path: "$company_industry",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "projects",
              localField: "_id",
              foreignField: "professional_id",
              as: "project_List",
            },
          },
          {
            $lookup: {
              from: "professionalratings",
              localField: "_id",
              foreignField: "professional_id",
              as: "professional_ratings",
            },
          },
          {
            $project: {
              first_name: 1,
              last_name: 1,
              username: 1,
              email: 1,
              approved_as_professional: 1,
              social_id: 1,
              login_type: 1,
              two_step_verification: 1,
              availabeRoles: 1,
              status: 1,
              notification_settings: 1,
              createdAt: 1,
              profile_image: 1,
              address: 1,
              description: 1,
              languages: 1,
              last_step: 1,
              profile_percentage: 1,
              proof_of_address: 1,
              proof_of_identity: 1,
              certification: 1,
              company_details: 1,
              education: 1,
              has_company: 1,
              website: 1,
              services: 1,
              services1: 1,
              service: 1,
              approved_by_admin: 1,
              basic_profile_completed: 1,
              company_country: 1,
              service_category_details: 1,
              service_details: 1,
              project_List: 1,
              social_account: 1,
              // User_detail:1,
              service_sub_category_details: 1,
              loc: 1,
              overall_ratings: {
                $avg: "$professional_ratings.rating",
              },
              total_ratings: {
                $size: "$professional_ratings",
              },
            },
          },
        ]);
        profile.data = profile.data.length > 0 ? profile.data[0] : null;
        resolve(profile.data);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        if (data.service_id && data.service_id != "undefined") {
          condition.service_id = mongoose.Types.ObjectId(data.service_id);
        }

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(collection, condition, "_id name");

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceSubCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        if (
          data.service_category_id &&
          data.service_category_id != "undefined"
        ) {
          condition.service_category_id = mongoose.Types.ObjectId(
            data.service_category_id
          );
        }

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(collection, condition, "_id name");

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getHouseTypes(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(collection, condition, "_id name");

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getHouseSubTypes(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        if (data.houseTypeIds && data.houseTypeIds != "undefined") {
          condition.house_type_id = {
            $in: await convertToObjectIds(data.houseTypeIds.split(",")),
          };
        }

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(collection, condition, "_id name");

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServices(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(
          collection,
          condition,
          "_id name image slug known_as icon description"
        );

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getAboutLocationQuestions(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };

        const item = await getItemsCustom(
          collection,
          condition,
          "_id question"
        );

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getComplianceQuestions(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemsCustom(
          collection,
          {},
          "_id question answer_form options"
        );

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProfessionalServices(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          // "professionalDetails.approved_as_professional": "approved",
        };
        const lookCond = {};
        if (data.service_category_id) {
          condition.service_category_id = mongoose.Types.ObjectId(
            data.service_category_id
          );
        }

        if (data.service_sub_category_id) {
          condition.service_sub_category_id = mongoose.Types.ObjectId(
            data.service_sub_category_id
          );
        }

        if (data.service_id) {
          condition.service_id = mongoose.Types.ObjectId(data.service_id);
        }

        if (data.is_advertisement) {
          condition.is_advertisement = true;
        }

        if (data.is_draft) {
          condition.is_draft = false;
        }

        if (data.hasOwnProperty("overall_ratings")) {
          lookCond.overall_ratings = {
            $gte: Number(data.overall_ratings),
            $lt: Number(data.overall_ratings) + 0.5,
          };
        }

        let aggregation = [
          {
            $lookup: {
              from: "bookingratings",
              localField: "_id",
              foreignField: "professional_service_id",
              as: "booking_ratings",
            },
          },
        ];

        let projection = {
          _id: 1,
          professional_id: 1,
          title: 1,
          description: 1,
          // booking_ratings: 1,
          overall_ratings: {
            $avg: "$booking_ratings.rating",
          },
          total_ratings: {
            $size: "$booking_ratings",
          },
          service_id: 1,
          service_category_id: 1,
          service_sub_category_id: 1,
          "single_plan.basic.price": 1,
          image: {
            $arrayElemAt: ["$images", 0],
          },
          "serviceDetails.name": 1,
          is_wishlist: 1,
          is_draft: 1,
          price: 1,
          "serviceBookings.total_amount_paid": 1,
        };

        if (data.screen == "my-services") {
          projection.is_draft = 1;
          projection.step = 1;
          projection["serviceBookings._id"] = 1;
          condition.professional_id = mongoose.Types.ObjectId(data.user_id);
          if (data.return_only == "draft" || data.return_only == "active") {
            condition.is_draft = data.return_only == "draft" ? true : false;
          }
        } else {
          projection["professionalDetails.profile_image"] = 1;
          condition.is_draft = false;
          condition.is_active = true;
        }

        if (data.service_slug) {
          condition["serviceDetails.slug"] = data.service_slug;
        }

        if (data.search) {
          condition.$or = [
            {
              title: new RegExp(data.search, "i"),
            },
            {
              description: new RegExp(data.search, "i"),
            },
            {
              meta_keywords: new RegExp(data.search, "i"),
            },
            {
              "serviceDetails.name": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.language": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.city": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.country": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.services.ServiceCategory": new RegExp(
                data.search,
                "i"
              ),
            },
          ];
        }

        if (data.screen != "my-services") {
          aggregation.push(
            {
              $lookup: {
                from: "services",
                localField: "service_id",
                foreignField: "_id",
                as: "serviceDetails",
              },
            },
            {
              $unwind: {
                path: "$serviceDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "professional_id",
                foreignField: "_id",
                as: "professionalDetails",
              },
            },
            {
              $unwind: {
                path: "$professionalDetails",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        } else if (data.screen == "my-services") {
          aggregation.push(
            {
              $lookup: {
                from: "servicebookings",
                let: {
                  professionalServiceId: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$professional_service_id",
                          "$$professionalServiceId",
                        ],
                      },
                      status: "pending",
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                as: "serviceBookings",
              },
            },
            {
              $unwind: {
                path: "$serviceBookings",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        }
        // console.log("******condition**", condition);

        const items = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER,
          },
          {
            $project: projection,
          },
          {
            $match: lookCond,
          },
        ]);
        // console.log("*******************item***", items);

        if (data.screen == "my-services") {
          items.totalRecords = await countDocuments(collection, condition);
        } else {
          items.totalRecords = await aggregateCollection(collection, [
            ...aggregation,
            {
              $match: condition,
            },
            {
              $count: "data",
            },
          ]);
          items.totalRecords =
            items.totalRecords.data.length > 0
              ? items.totalRecords.data[0].data
              : 0;
        }

        resolve(items);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProfessionalServiceDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        function getCustomLookUpForServicePlans(localField) {
          return {
            $lookup: {
              from: "serviceplans",
              let: {
                plan_id: `$${localField}`,
              },
              pipeline: [
                {
                  $match: {
                    /*  */ $expr: {
                      // $in: ["$_id", []], // [] --> Temporary Solutioin ...
                      // $in: ["$_id", "$$plan_id"], // Old Code
                      $in: [
                        "$_id",
                        {
                          $cond: {
                            if: { $gte: ["$$plan_id", 0] },
                            then: "$$plan_id",
                            else: [],
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              as: localField,
            },
          };
        }

        function getMappedServices(field) {
          return {
            $map: {
              input: `$${field}`,
              as: "plans",
              in: "$$plans.name",
            },
          };
        }

        let servicePlanGroup = {
          title: 1,
          description: 1,
          price: 1,
          estimated_time: 1,
          estimated_time_unit: 1,
          delivery_days: 1,
          no_of_revision: 1,
          no_of_words: 1,
          outline: 1,
          text_rewrite: 1,
          topic_reserach: 1,
          references: 1,
          e_book: 1,
          price: 1,
        };

        let servicePlanProjection = {
          price_per: 1,
          basic: servicePlanGroup,
          premium: servicePlanGroup,
          platinum: servicePlanGroup,
          premium_enabled: 1,
          platinum_enabled: 1,
        };

        const item = await aggregateCollection(collection, [
          {
            $match: {
              _id: mongoose.Types.ObjectId(data.professional_service_id),
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },

          {
            $unwind: {
              path: "$serviceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          // {
          //   $lookup: {
          //     from: "professionalservices",
          //     localField: "no_of_revision",
          //     foreignField: "_id",
          //     as: "no_of_revenue_data",
          //   },
          // },
          // {
          //   $unwind: {
          //     path: "$no_of_revenue_data",
          //     preserveNullAndEmptyArrays: false,
          //   },
          // },
          {
            $lookup: {
              from: "housesubtypes",
              localField: "house_sub_type_id",
              foreignField: "_id",
              as: "houseSubTypes",
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "professional_id",
              foreignField: "_id",
              as: "professionalDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "product_id",
              foreignField: "_id",
              as: "productsListing",
            },
          },

          {
            $lookup: {
              from: "bookingratings",
              localField: "_id",
              foreignField: "professional_service_id",
              as: "booking_ratings",
            },
          },

          {
            $lookup: {
              from: "religions",
              localField: "_id",
              foreignField: "religion_id",
              as: "religion_id",
            },
          },
          {
            $unwind: {
              path: "$religion_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "eventtypes",
              localField: "event_type",
              foreignField: "_id",
              as: "eventsDetails",
            },
          },
          {
            $unwind: {
              path: "$eventsDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "materialtypes",
              localField: "materail_type",
              foreignField: "_id",
              as: "materialDetails",
            },
          },

          {
            $lookup: {
              from: "ringsizes",
              localField: "ring_size",
              foreignField: "_id",
              as: "ringDetails",
            },
          },
          {
            $unwind: {
              path: "$ringDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "sizes",
              localField: "attire_size",
              foreignField: "_id",
              as: "attire_size_detail",
            },
          },
          {
            $unwind: {
              path: "$attire_size_detail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "colors",
              localField: "attire_color",
              foreignField: "_id",
              as: "attire_color_detail",
            },
          },
          {
            $lookup: {
              from: "countries",
              localField: "country",
              foreignField: "_id",
              as: "country_detail",
            },
          },
          {
            $lookup: {
              from: "serviceunitmeasurements",
              localField: "unit",
              foreignField: "_id",
              as: "unit_detail",
            },
          },
          {
            $lookup: {
              from: "travellings",
              localField: "departure",
              foreignField: "_id",
              as: "departure_detail",
            },
          },
          {
            $unwind: {
              path: "$departure_detail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "travellings",
              localField: "destination",
              foreignField: "_id",
              as: "destination_detail",
            },
          },
          {
            $unwind: {
              path: "$destination_detail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$unit_detail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$attire_color_detail",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $unwind: {
              path: "$materialDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          getCustomLookUpForServicePlans("single_plan.basic.included_services"),
          getCustomLookUpForServicePlans(
            "single_plan.premium.included_services"
          ),
          getCustomLookUpForServicePlans(
            "single_plan.platinum.included_services"
          ),
          getCustomLookUpForServicePlans(
            "continues_plan.basic.included_services"
          ),
          getCustomLookUpForServicePlans(
            "continues_plan.premium.included_services"
          ),
          getCustomLookUpForServicePlans(
            "continues_plan.platinum.included_services"
          ),
          {
            $project: {
              _id: 1,
              continues_plan: 1,
              delivery_type: 1,
              description: 1,
              faqs: 1,
              images: 1,
              project_steps: 1,
              service_category_id: 1,
              service_id: 1,
              service_sub_category_id: 1,
              single_plan: 1,
              title: 1,
              service_process: 1,
              document: 1,
              video: 1,
              about_location: 1,
              dynamic_steps: 1,
              city: 1,
              operating_since: 1,
              execution_time: 1,
              market_share: 1,
              keywords: 1,
              unit: 1,
              airline: 1,
              advertisement_type: 1,
              height: 1,
              width: 1,
              purpose_of_advertisement: 1,
              ad_placement: 1,
              advertisement_format: 1,
              price: 1,
              terms_for_customers: 1,
              single_plan: servicePlanProjection,
              continues_plan: servicePlanProjection,
              serviceformsteps: 1,
              airport: 1,
              airport_type: 1,
              airstatus: 1,
              airport_rank: 1,
              is_wishlist: 1,

              date: 1,
              domestic_travellers: 1,
              airport_rank: 1,
              overall_ratings: {
                $avg: "$booking_ratings.rating",
              },
              total_ratings: {
                $size: "$booking_ratings",
              },
              "booking_ratings.review": 1,
              internation_travellers: 1,
              total_operating_destination: 1,
              no_of_airline: 1,
              no_of_terminals: 1,
              monthly_passenger: 1,
              cinema: 1,
              cinema_chain_brand: 1,
              screen_category: 1,
              screen_type: 1,
              screen_code: 1,
              screen_number: 1,
              capacity: 1,
              mall_details: 1,
              movie_type: 1,

              mediamagazine: 1,
              frequency: 1,
              circulation: 1,
              magazineLang: 1,
              readership: 1,
              audience_type: 1,
              magazine_cat: 1,
              service: 1,
              cover_price: 1,
              resolution: 1,
              geo_coverage: 1,
              religion_id: 1,
              professional_id: 1,
              professional_service_id: 1,
              professional_service_details: 1,
              date: 1,
              pincode: 1,
              address: 1,
              transportation_vehicle: 1,
              event_budget: 1,
              materail_type: 1,
              ring_size: 1,
              attire_size: 1,
              attire_color: 1,
              country: 1,
              custom: 1,
              state: 1,
              accmodation_details: 1,
              departure: 1,
              date_of_deaprture: 1,
              destination: 1,
              flight_deatils: 1,
              honeymoon_details: 1,
              meal_details: 1,
              no_of_days: 1,
              no_of_nights: 1,
              package_details: 1,
              package_title: 1,
              tour_type: 1,
              visa_passport: 1,
              date_of_destination: 1,
              transportation_vehicle: 1,
              card_details: 1,
              per_budget: 1,
              making_charges: 1,
              gst: 1,
              grand_total: 1,
              metal: 1,
              shop_for: 1,
              hsn_code: 1,
              product_id: 1,
              selected_product: 1,
              is_advertisement: 1,
              page_per_visit: 1,
              monthly_visitors: 1,
              bid_type: 1,
              medium: 1,
              productsListing: 1,
              language: 1,
              audiance_type: 1,
              departure_detail: 1,
              destination_detail: 1,
              industry_id: 1,
              price1: 1,
              price2: 1,
              price3: 1,

              unit_detail: 1,
              country_detail: 1,
              "eventsDetails.name": 1,
              "materialDetails.name": 1,
              "ringDetails.name": 1,
              "attire_size_detail.name": 1,
              "attire_color_detail.name": 1,
              "products.name": 1,
              "products.category_id": 1,

              "products.brand": 1,
              "products.description": 1,
              "products.images": 1,
              "single_plan.basic.included_services": getMappedServices(
                "single_plan.basic.included_services"
              ),
              "single_plan.premium.included_services": getMappedServices(
                "single_plan.premium.included_services"
              ),
              "single_plan.platinum.included_services": getMappedServices(
                "single_plan.platinum.included_services"
              ),
              "continues_plan.basic.included_services": getMappedServices(
                "continues_plan.basic.included_services"
              ),
              "continues_plan.premium.included_services": getMappedServices(
                "continues_plan.premium.included_services"
              ),
              "continues_plan.platinum.included_services": getMappedServices(
                "continues_plan.platinum.included_services"
              ),
              "single_plan.plans": "$single_plan.plans",
              "single_plan.title": "$single_plan.title",
              "continues_plan.plans": "$continues_plan.plans",
              "continues_plan.title": "$continues_plan.title",
              "serviceDetails.name": 1,
              "serviceCategoryDetails.name": 1,
              "serviceSubCategoryDetails.name": 1,
              "professionalDetails.profile_image": 1,
              "professionalDetails.first_name": 1,
              "professionalDetails.last_name": 1,
              "professionalDetails._id": 1,
              // "professionalDetails.professional_service_details": 1,

              houseSubTypes: {
                $map: {
                  input: "$houseSubTypes",
                  as: "houseSubTypes",
                  in: "$$houseSubTypes.name",
                },
              },
              image: {
                $arrayElemAt: ["$images", 0],
              },
            },
          },
        ]);

        let response = {
          code: 200,
          data: item.data.length > 0 ? item.data[0] : null,
        };

        resolve(response);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getGeneralManagement(collection, type) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemCustom(collection, { type }, "value");
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getAddresses(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          user_id: mongoose.Types.ObjectId(data.user_id),
        };
        if (data.address_id) {
          condition._id = {
            $in: await convertToObjectIds(data.address_id),
          };
        }
        const item = await getItemsCustom(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getOrders(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          [data.screen && data.screen == "professional_orders"
            ? "professional_id"
            : "user_id"]: mongoose.Types.ObjectId(data.user_id),
          booking_completed: true,
        };

        // if (data.type == "ongoing") {
        //   condition.status = {
        //     $in: ["pending"],
        //   };
        // } else if (data.type == "cancelled" || data.type == "rejected") {
        //   condition.status = {
        //     $in: ["cancelled", "rejected"],
        //   };
        // } else {
        //   condition.status = data.type;
        // }

        if (data.type == "ongoing") {
          condition.status = {
            $in: ["pending"],
          };
        } else if (data.type == "cancelled" || data.type == "rejected") {
          condition.status = {
            $in: ["cancelled", "rejected"],
          };
        } else if (data.type) {
          condition.status = data.type;
        }

        if (data.service_category_id) {
          condition["serviceCategoryDetails._id"] = mongoose.Types.ObjectId(
            data.service_category_id
          );
        }

        if (data.service_sub_category_id) {
          condition["serviceSubCategoryDetails._id"] = mongoose.Types.ObjectId(
            data.service_sub_category_id
          );
        }

        if (data.total_amount_paid) {
          condition.total_amount_paid = +data.total_amount_paid;
        }

        if (data.booking_date) {
          const START_DAY = new Date(
            moment(new Date(data.booking_date)).utc().startOf("day")
          );
          const END_DAY = new Date(
            moment(new Date(data.booking_date)).utc().endOf("day")
          );

          condition.booking_date = {
            $gte: START_DAY,
            $lte: END_DAY,
          };

          // condition.booking_date = new Date(data.booking_date);
        }

        // if(data.service_category_id || data.service_sub_category_id || data.total_amount_paid || data.booking_date){
        //   condition.$or=[
        //     { "serviceSubCategoryDetails._id":mongoose.Types.ObjectId(data.service_sub_category_id),

        //      total_amount_paid:data.total_amount_paid,
        //      booking_date:data.booking_date }]
        // }

        let projection = {
          total_amount_paid: 1,
          status: 1,
          plan_type: 1,
          order_id: 1,
          createdAt: 1,
          booking_date: 1,
          professional_service_id: 1,
          payment_intent_id: 1,
          paymentIntent_Detail: 1,
          cancellation_reason: 1,
          user_id: 1,
          professional_id: 1,
          accepted_at: 1,
          order_complete_otp: 1,
          "service_details.title": 1,
          "service_details.service_id": 1,
          image: {
            $arrayElemAt: ["$professionalServiceDetails.images", 0],
          },
          image_v2: {
            $arrayElemAt: ["$service_details.images", 0],
          },
          "mainServiceDetails.name": 1,
          "mainServiceDetails.name": 1,
          "serviceCategoryDetails.name": 1,
          "serviceSubCategoryDetails.name": 1,
          "serviceCategoryDetails._id": 1,
          "serviceSubCategoryDetails._id": 1,
          "professionalServiceDetails.title": 1,
          resolution_details: 1,
        };

        if (data.screen == "professional_orders") {
          projection.address = 1;
        }

        const items = await aggregateCollection(collection, [
          {
            $lookup: {
              from: "services",
              localField: "service_details.service_id",
              foreignField: "_id",
              as: "mainServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories", //service_details
              localField: "service_details.service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_details.service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "professionalservices",
              localField: "professional_service_id",
              foreignField: "_id",
              as: "professionalServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "resolutioncenters",
              localField: "_id",
              foreignField: "booking_id",
              as: "resolution_details",
            },
          },
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "booking_id",
              as: "paymentsDetail",
            },
          },
          {
            $unwind: {
              path: "$resolution_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $project: projection,
          },
        ]);
        // const items = await collection.aggregate([
        //   {
        //     $lookup: {
        //       from: "services",
        //       localField: "service_details.service_id",
        //       foreignField: "_id",
        //       as: "mainServiceDetails",
        //     },
        //   },
        //   {
        //     $unwind: {
        //       path: "$mainServiceDetails",
        //       preserveNullAndEmptyArrays: false,
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "servicecategories",
        //       localField: "service_details.service_category_id",
        //       foreignField: "_id",
        //       as: "serviceCategoryDetails",
        //     },
        //   },
        //   {
        //     $unwind: {
        //       path: "$serviceCategoryDetails",
        //       preserveNullAndEmptyArrays: false,
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "servicesubcategories",
        //       localField: "service_details.service_sub_category_id",
        //       foreignField: "_id",
        //       as: "serviceSubCategoryDetails",
        //     },
        //   },
        //   {
        //     $unwind: {
        //       path: "$serviceSubCategoryDetails",
        //       preserveNullAndEmptyArrays: false,
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "professionalservices",
        //       localField: "professional_service_id",
        //       foreignField: "_id",
        //       as: "professionalServiceDetails",
        //     },
        //   },
        //   {
        //     $unwind: {
        //       path: "$professionalServiceDetails",
        //       preserveNullAndEmptyArrays: true,
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "resolutioncenters",
        //       localField: "_id",
        //       foreignField: "booking_id",
        //       as: "resolution_details",
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "payments",
        //       localField: "_id",
        //       foreignField: "booking_id",
        //       as: "paymentsDetail",
        //     },
        //   },
        //   {
        //     $unwind: {
        //       path: "$resolution_details",
        //       preserveNullAndEmptyArrays: true,
        //     },
        //   },
        //   {
        //     $match: condition,
        //   },
        //   {
        //     $project: projection,
        //   },
        // ]);
        items.totalRecords = await countDocuments(collection, condition);
        resolve(items);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProjectOrders(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          // [data.screen && data.screen == "professional_orders"
          //   ? "professional_id"
          //   : "user_id"]: mongoose.Types.ObjectId(data.user_id),
          // booking_completed: true,
          booking_type: "project",
        };

        if (data.type == "ongoing") {
          condition.status = {
            $in: ["pending", "waiting_for_payment_confirmation"],
          };
        } else if (data.type == "cancelled" || data.type == "rejected") {
          condition.status = {
            $in: ["cancelled", "rejected"],
          };
        } else if (data.type) {
          condition.status = data.type;
        }

        if (data.service_category_id) {
          condition["serviceCategoryDetails._id"] = mongoose.Types.ObjectId(
            data.service_category_id
          );
        }

        if (data.service_sub_category_id) {
          condition["serviceSubCategoryDetails._id"] = mongoose.Types.ObjectId(
            data.service_sub_category_id
          );
        }

        if (data.total_amount_paid) {
          condition.total_amount_paid = +data.total_amount_paid;
        }

        if (data.booking_date) {
          const START_DAY = new Date(
            moment(new Date(data.booking_date)).utc().startOf("day")
          );
          const END_DAY = new Date(
            moment(new Date(data.booking_date)).utc().endOf("day")
          );

          condition.booking_date = {
            $gte: START_DAY,
            $lte: END_DAY,
          };
        }

        let projection = {
          total_amount_paid: 1,
          status: 1,
          plan_type: 1,
          order_id: 1,
          project_id: 1,
          createdAt: 1,
          booking_date: 1,
          professional_service_id: 1,
          payment_intent_id: 1,
          paymentIntent_Detail: 1,
          cancellation_reason: 1,
          user_id: 1,
          professional_id: 1,
          booking_type: 1,
          accepted_at: 1,
          order_complete_otp: 1,
          "service_details.title": 1,
          "service_details.service_id": 1,
          image: {
            $arrayElemAt: ["$professionalServiceDetails.images", 0],
          },
          image_v2: {
            $arrayElemAt: ["$service_details.images", 0],
          },
          "mainServiceDetails.name": 1,
          "mainServiceDetails.name": 1,
          "serviceCategoryDetails.name": 1,
          "serviceSubCategoryDetails.name": 1,
          "serviceCategoryDetails._id": 1,
          "serviceSubCategoryDetails._id": 1,
          "professionalServiceDetails.title": 1,
          projectDetails: 1,
          resolution_details: 1,
        };

        if (data.screen == "professional_orders") {
          projection.address = 1;
        }
        console.log(condition);
        const items = await aggregateCollection(collection, [
          {
            $lookup: {
              from: "services",
              localField: "service_details.service_id",
              foreignField: "_id",
              as: "mainServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $lookup: {
              from: "projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $unwind: {
              path: "$projectDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $lookup: {
              from: "servicecategories", //service_details
              localField: "service_details.service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_details.service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "professionalservices",
              localField: "professional_service_id",
              foreignField: "_id",
              as: "professionalServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "resolutioncenters",
              localField: "_id",
              foreignField: "booking_id",
              as: "resolution_details",
            },
          },
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "booking_id",
              as: "paymentsDetail",
            },
          },
          {
            $unwind: {
              path: "$resolution_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $project: projection,
          },
        ]);

        items.totalRecords = await countDocuments(collection, condition);
        resolve(items);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getBookingDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data.booking_id),
        };

        let projection = {
          total_amount_paid: 1,
          service_fees: 1,
          service_price: 1,
          status: 1,
          plan_type: 1,
          order_id: 1,
          createdAt: 1,
          booking_date: 1,
          professional_id: 1,
          user_id: 1,
          quantity: 1,
          paymentIntent_Detail: 1,
          tax_value: 1,
          tax_type: 1,
          discount: 1,
          image: {
            $arrayElemAt: ["$professionalServiceDetails.images", 0],
          },
          image_v2: {
            $arrayElemAt: ["$service_details.images", 0],
          },
          questions: 1,
          address: 1,
          service_details: 1,
          "mainServiceDetails.name": 1,
          "mainServiceDetails.name": 1,
          "serviceCategoryDetails.name": 1,
          "serviceSubCategoryDetails.name": 1,
          "professionalServiceDetails.title": 1,
          "professionalServiceDetails.description": 1,
          "endUserDetails.profile_image": 1,
          "endUserDetails.first_name": 1,
          "endUserDetails.email": 1,
          "endUserDetails.phone_number": 1,
        };

        let aggregation = [
          {
            $match: condition,
          },
          {
            $lookup: {
              from: "services",
              localField: "service_details.service_id",
              foreignField: "_id",
              as: "mainServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_details.service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_details.service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          // {
          //   $lookup: {
          //     from: "professionalservices",
          //     localField: "professional_service_id",
          //     foreignField: "_id",
          //     as: "professionalServiceDetails",
          //   },
          // },
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "booking_id",
              as: "professionalServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        if (data.screen == "professional_booking_details") {
          aggregation.push(
            {
              $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "endUserDetails",
              },
            },
            {
              $unwind: {
                path: "$endUserDetails",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        } else {
          aggregation.push(
            {
              $lookup: {
                from: "users",
                localField: "professional_id",
                foreignField: "_id",
                as: "endUserDetails",
              },
            },
            {
              $unwind: {
                path: "$endUserDetails",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        }

        const item = await aggregateCollection(collection, [
          ...aggregation,
          {
            $project: projection,
          },
        ]);
        item.data = item.data.length > 0 ? item.data[0] : null;
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProjectBookingDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data.project_booking_id),
        };

        let projection = {
          total_amount_paid: 1,
          service_fees: 1,
          service_price: 1,
          status: 1,
          plan_type: 1,
          order_id: 1,
          createdAt: 1,
          booking_date: 1,
          professional_id: 1,
          user_id: 1,
          project_id: 1,
          quantity: 1,
          paymentIntent_Detail: 1,
          tax_value: 1,
          tax_type: 1,
          discount: 1,
          image: {
            $arrayElemAt: ["$professionalServiceDetails.images", 0],
          },
          image_v2: {
            $arrayElemAt: ["$service_details.images", 0],
          },
          questions: 1,
          address: 1,
          service_details: 1,
          "mainServiceDetails.name": 1,
          "mainServiceDetails.name": 1,
          "serviceCategoryDetails.name": 1,
          "serviceSubCategoryDetails.name": 1,
          "professionalServiceDetails.title": 1,
          "professionalServiceDetails.description": 1,
          "endUserDetails.profile_image": 1,
          "endUserDetails.first_name": 1,
          "endUserDetails.email": 1,
          "endUserDetails.phone_number": 1,
          projectDetails: 1,
        };

        let aggregation = [
          {
            $match: condition,
          },
          {
            $lookup: {
              from: "services",
              localField: "service_details.service_id",
              foreignField: "_id",
              as: "mainServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_details.service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_details.service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "projects",
              localField: "project_id",
              foreignField: "_id",
              as: "projectDetails",
            },
          },
          {
            $unwind: {
              path: "$projectDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          // {
          //   $lookup: {
          //     from: "professionalservices",
          //     localField: "professional_service_id",
          //     foreignField: "_id",
          //     as: "professionalServiceDetails",
          //   },
          // },
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "booking_id",
              as: "professionalServiceDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        if (data.screen == "professional_booking_details") {
          aggregation.push(
            {
              $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "endUserDetails",
              },
            },
            {
              $unwind: {
                path: "$endUserDetails",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        } else {
          aggregation.push(
            {
              $lookup: {
                from: "users",
                localField: "professional_id",
                foreignField: "_id",
                as: "endUserDetails",
              },
            },
            {
              $unwind: {
                path: "$endUserDetails",
                preserveNullAndEmptyArrays: true,
              },
            }
          );
        }

        const item = await aggregateCollection(collection, [
          ...aggregation,
          {
            $project: projection,
          },
        ]);
        item.data = item.data.length > 0 ? item.data[0] : null;
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceFormQuestions(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        if (data.type) {
          condition.type = data.type;
        }

        if (data.country_id) {
          condition.country_id = data.country_id;
        }

        if (data.service_id) {
          condition.service_id = data.service_id;
        }

        if (data.service_category_id) {
          condition.service_category_id = data.service_category_id;
        }

        if (data.service_sub_category_id) {
          condition.service_sub_category_id = data.service_sub_category_id;
        }

        const item = await getItemsCustom(
          collection,
          condition,
          "",
          "_id question answer_form options type"
        );
        item.totalRecords = await countDocuments(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceFormSteps(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };
        const item = await getItemsCustom(
          collection,
          condition,
          "_id title description questions"
        );
        item.totalRecords = await countDocuments(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceFormHeadings(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemsCustom(
          collection,
          {},
          "_id title description type"
        );
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProductCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };
        const item = await getItemsCustom(
          collection,
          condition,
          "_id name",
          "",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProductSubCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          product_category_id: mongoose.Types.ObjectId(
            data.product_category_id
          ),
          is_active: true,
        };
        const item = await getItemsCustom(
          collection,
          condition,
          "_id name",
          "",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getProducts(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          professional_id: mongoose.Types.ObjectId(data.professional_id),
        };

        let projection = {
          _id: 1,
          name: 1,
        };

        if (data.screen != "create_new_service") {
          Object.assign(projection, {
            description: 1,
            image: {
              $arrayElemAt: ["$images", 0],
            },
          });
        }

        const item = await aggregateCollection(collection, [
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER,
          },
          {
            $project: projection,
          },
        ]);
        item.totalRecords = await countDocuments(collection, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getJobCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          is_active: true,
        };
        const item = await getItemsCustom(
          collection,
          condition,
          "_id name is_active",
          "",
          { createdAt: -1 }
        );
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getJobSkills(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          job_category_id: mongoose.Types.ObjectId(data.job_category_id),
          is_active: true,
        };

        if (data.search && data.search != "undefined") {
          condition.name = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(
          collection,
          condition,
          "_id name",
          "",
          { createdAt: -1 }
        );
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  // async getJobs(collection, data) {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       let condition = {};

  //       let aggregation = [
  //         {
  //           $lookup: {
  //             from: "jobcategories",
  //             foreignField: "_id",
  //             localField: "job_category_id",
  //             as: "jobCategoryDetails",
  //           },
  //         },
  //         {
  //           $unwind: {
  //             path: "$jobCategoryDetails",
  //             preserveNullAndEmptyArrays: true,
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: "jobskills",
  //             foreignField: "_id",
  //             localField: "job_skills.job_skill_id",
  //             as: "jobSkills",
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: "jobproposals",
  //             foreignField: "job_id",
  //             localField: "_id",
  //             as: "proposals",
  //           },
  //         },
  //       ];

  //       let projection = {
  //         _id: 1,
  //         title: 1,
  //         description: 1,
  //         "jobCategoryDetails.name": 1,
  //         jobSkills: {
  //           $map: {
  //             input: "$jobSkills",
  //             as: "jobSkills",
  //             in: "$$jobSkills.name",
  //           },
  //         },
  //         budget: 1,
  //         scope: 1,
  //         proposals: {
  //           $size: "$proposals",
  //         },
  //         createdAt: 1,
  //       };

  //       if (data.screen == "client-posted-jobs") {
  //         condition.client_id = mongoose.Types.ObjectId(data.user_id);
  //       } else {
  //         Object.assign(condition, {
  //           professional_hired: false,
  //           is_draft: false,
  //           is_active: true,
  //         });
  //       }

  //       if (data.search) {
  //         condition.$or = [
  //           {
  //             title: new RegExp(data.search, "i"),
  //           },
  //           {
  //             description: new RegExp(data.search, "i"),
  //           },
  //           {
  //             "job_skills.name": new RegExp(data.search, "i"),
  //           },
  //           {
  //             "jobCategoryDetails.name": new RegExp(data.search, "i"),
  //           },
  //         ];
  //       }

  //       if (data.experience_level) {
  //         condition["scope.experience_level"] = data.experience_level;
  //       }

  //       if (data.proposals) {
  //         // condition[`proposals.${+data.proposals.split(',')[1]}`] = {
  //         //   $exists: true
  //         // }
  //       }

  //       if (data.contract_to_hire_opportunity == "true") {
  //         condition["scope.contract_to_hire_opportunity"] = true;
  //       }

  //       const items = await aggregateCollection(collection, [
  //         ...aggregation,
  //         {
  //           $match: condition,
  //         },
  //         {
  //           $project: projection,
  //         },
  //         {
  //           $sort: {
  //             createdAt: -1,
  //           },
  //         },
  //         {
  //           $skip: data.offset ? +data.offset : 0,
  //         },
  //         {
  //           $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER,
  //         },
  //       ]);

  //       items.totalRecords = await aggregateCollection(collection, [
  //         ...aggregation,
  //         {
  //           $match: condition,
  //         },
  //         {
  //           $count: "data",
  //         },
  //       ]);
  //       items.totalRecords =
  //         items.totalRecords.data.length > 0
  //           ? items.totalRecords.data[0].data
  //           : 0;

  //       resolve(items);
  //     } catch (error) {
  //       reject(buildErrObject(422, error.message));
  //     }
  //   });
  // },

  async getJobs(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(".......................", data);
        let condition = {};

        let aggregation = [
          {
            $lookup: {
              from: "jobcategories",
              foreignField: "_id",
              localField: "job_category_id",
              as: "jobCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$jobCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobskills",
              foreignField: "_id",
              localField: "job_skills.job_skill_id",
              as: "jobSkills",
            },
          },
          {
            $lookup: {
              from: "jobproposals",
              foreignField: "job_id",
              localField: "_id",
              as: "proposals",
            },
          },
          {
            $addFields: {
              proposals: {
                $size: "$proposals",
              },
            },
          },
        ];

        let projection = {
          _id: 1,
          title: 1,
          description: 1,
          job_location: 1,
          job_record: 1,
          "jobCategoryDetails.name": 1,
          jobSkills: {
            $map: {
              input: "$jobSkills",
              as: "jobSkills",
              in: "$$jobSkills.name",
            },
          },
          budget: 1,
          scope: 1,
          proposals: 1,
          createdAt: 1,
        };

        if (data.screen == "client-posted-jobs") {
          console.log("***********", data.screen);
          condition.client_id = mongoose.Types.ObjectId(data.user_id);
        } else {
          Object.assign(condition, {
            professional_hired: false,
            is_draft: false,
            is_active: true,
          });
        }

        var sort = {};
        if (data.sort == "Oldest") {
          sort.createdAt = 1;
          aggregation.push({ $sort: sort });
        } else if (data.sort == "Newest") {
          sort.createdAt = -1;
          aggregation.push({ $sort: sort });
        } else {
          sort.createdAt = -1;
          aggregation.push({ $sort: sort });
        }

        if (data.search) {
          condition.$or = [
            {
              title: new RegExp(data.search, "i"),
            },
            {
              description: new RegExp(data.search, "i"),
            },
            {
              "job_skills.name": new RegExp(data.search, "i"),
            },
            {
              "jobCategoryDetails.name": new RegExp(data.search, "i"),
            },
          ];
        }
        if (data.experience_level) {
          condition["scope.experience_level"] = data.experience_level;
        }

        if (data.proposals) {
          var result = data.proposals.split(",");
          var numbers = [];
          result.forEach((val) => numbers.push(Number(val)));
          // console.log(numbers)
          condition.proposals = { $in: numbers };
        }

        if (data.duration) {
          condition["scope.duration"] = data.duration;
        }

        if (data.contract_to_hire_opportunity == "true") {
          condition["scope.contract_to_hire_opportunity"] = true;
        }
        console.log("bhfcjdsgfhjdsgfhds", condition);
        const items = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $project: projection,
          },
          // {
          //   $sort: {
          //     createdAt: -1,
          //   },
          // },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER,
          },
        ]);

        items.totalRecords = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $count: "data",
          },
        ]);
        items.totalRecords =
          items.totalRecords.data.length > 0
            ? items.totalRecords.data[0].data
            : 0;

        resolve(items);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getPostedJobs(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          client_id: mongoose.Types.ObjectId(data.user_id),
        };

        let aggregation = [
          {
            $lookup: {
              from: "jobcategories",
              foreignField: "_id",
              localField: "job_category_id",
              as: "jobCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$jobCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobskills",
              foreignField: "_id",
              localField: "job_skills.job_skill_id",
              as: "jobSkills",
            },
          },
          {
            $lookup: {
              from: "jobproposals",
              foreignField: "job_id",
              localField: "_id",
              as: "proposals",
            },
          },
        ];

        let projection = {
          _id: 1,
          title: 1,
          description: 1,
          "jobCategoryDetails.name": 1,
          jobSkills: {
            $map: {
              input: "$jobSkills",
              as: "jobSkills",
              in: "$$jobSkills.name",
            },
          },
          budget: 1,
          scope: 1,
          proposals: {
            $size: "$proposals",
          },
          createdAt: 1,
        };

        /* if (data.screen == 'client-posted-jobs') {
           condition.client_id = mongoose.Types.ObjectId(data.user_id)
         } else {
           Object.assign(condition, {
             professional_hired: false,
             is_draft: false,
             is_active: true
           })
         }*/

        if (data.search) {
          condition.$or = [
            {
              title: new RegExp(data.search, "i"),
            },
            {
              description: new RegExp(data.search, "i"),
            },
            {
              "job_skills.name": new RegExp(data.search, "i"),
            },
            {
              "jobCategoryDetails.name": new RegExp(data.search, "i"),
            },
          ];
        }

        if (data.experience_level) {
          condition["scope.experience_level"] = data.experience_level;
        }

        if (data.proposals) {
          // condition[`proposals.${+data.proposals.split(',')[1]}`] = {
          //   $exists: true
          // }
        }

        if (data.contract_to_hire_opportunity == "true") {
          condition["scope.contract_to_hire_opportunity"] = true;
        }

        const items = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $project: projection,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER,
          },
        ]);

        items.totalRecords = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $count: "data",
          },
        ]);
        items.totalRecords =
          items.totalRecords.data.length > 0
            ? items.totalRecords.data[0].data
            : 0;

        resolve(items);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  // async getJobDetails(collection, data) {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       let condition = {
  //         _id: mongoose.Types.ObjectId(data.job_id),
  //       };

  //       let aggregation = [
  //         {
  //           $lookup: {
  //             from: "jobcategories",
  //             foreignField: "_id",
  //             localField: "job_category_id",
  //             as: "jobCategoryDetails",
  //           },
  //         },
  //         {
  //           $unwind: {
  //             path: "$jobCategoryDetails",
  //             preserveNullAndEmptyArrays: true,
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: "jobskills",
  //             foreignField: "_id",
  //             localField: "job_skills.job_skill_id",
  //             as: "jobSkills",
  //           },
  //         },
  //       ];

  //       let projection = {
  //         _id: 1,
  //         title: 1,
  //         description: 1,
  //         "jobCategoryDetails.name": 1,
  //         jobSkills: {
  //           $map: {
  //             input: "$jobSkills",
  //             as: "jobSkills",
  //             in: "$$jobSkills.name",
  //           },
  //         },
  //         budget: 1,
  //         scope: 1,
  //         term: 1,
  //         createdAt: 1,
  //       };

  //       if (data.screen == "client-job-details") {
  //         aggregation.push({
  //           $lookup: {
  //             from: "jobproposals",
  //             let: {
  //               jobId: "$_id",
  //             },
  //             pipeline: [
  //               {
  //                 $match: {
  //                   $expr: {
  //                     $eq: ["$job_id", "$$jobId"],
  //                   },
  //                 },
  //               },
  //               {
  //                 $lookup: {
  //                   from: "users",
  //                   foreignField: "_id",
  //                   localField: "professional_id",
  //                   as: "professionalDetails",
  //                 },
  //               },
  //               {
  //                 $unwind: {
  //                   path: "$professionalDetails",
  //                   preserveNullAndEmptyArrays: false,
  //                 },
  //               },
  //               {
  //                 $group: {
  //                   _id: "$status",
  //                   records: {
  //                     $push: "$$ROOT",
  //                   },
  //                 },
  //               },
  //             ],
  //             as: "proposals",
  //           },
  //         });
  //         Object.assign(projection, {
  //           proposals: {
  //             _id: 1,
  //             records: {
  //               _id: 1,
  //               payment_required_in: 1,
  //               milestones: 1,
  //               time_needed: 1,
  //               cover_letter: 1,
  //               status: 1,
  //               createdAt: 1,
  //               professionalDetails: {
  //                 first_name: 1,
  //                 last_name: 1,
  //                 profile_image: 1,
  //                 description: 1,
  //                 address: 1,
  //               },
  //             },
  //           },
  //         });
  //       }else if (data.screen == "professional-job-details") {
  //         aggregation.push(
  //           {
  //             $lookup: {
  //               from: "users",
  //               let: {
  //                 clientId: "$client_id",
  //               },
  //               pipeline: [
  //                 {
  //                   $match: {
  //                     $expr: {
  //                       $eq: ["$_id", "$$clientId"],
  //                     },
  //                   },
  //                 },
  //                 {
  //                   $lookup: {
  //                     from: "jobs",
  //                     foreignField: "client_id",
  //                     localField: "_id",
  //                     as: "postedJobs",
  //                   },
  //                 },
  //               ],
  //               as: "clientDetails",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "jobproposals",
  //               let: {
  //                 jobId: "$_id"
  //               },
  //               pipeline: [
  //                 {
  //                   $match: {
  //                     $expr: {
  //                       $and:[
  //                         {$eq: ["$job_id", "$$jobId"]},
  //                         {$eq: ["$professional_id", data.user_id]}
  //                       ]

  //                     },
  //                   },
  //                 },
  //                 {
  //                   $count: "submitproposal"
  //                 }
  //               ],
  //               as: "submitproposal"
  //             },

  //           },
  //           {
  //             $unwind: {
  //               path: "$submitproposal",
  //               preserveNullAndEmptyArrays: false,
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: "$clientDetails",
  //               preserveNullAndEmptyArrays: false,
  //             },
  //           }
  //         );
  //         Object.assign(projection, {
  //           clientDetails: {
  //             first_name: 1,
  //             last_name: 1,
  //             address: 1,
  //             postedJobs: {
  //               $size: "$clientDetails.postedJobs",
  //             },
  //             createdAt: 1,
  //           },
  //           submitproposal:1
  //         });
  //       }

  //       //  else if (data.screen == "professional-job-details") {
  //       //   aggregation.push(
  //       //     {
  //       //       $lookup: {
  //       //         from: "users",
  //       //         let: {
  //       //           clientId: "$client_id",
  //       //         },
  //       //         pipeline: [
  //       //           {
  //       //             $match: {
  //       //               $expr: {
  //       //                 $eq: ["$_id", "$$clientId"],
  //       //               },
  //       //             },
  //       //           },
  //       //           {
  //       //             $lookup: {
  //       //               from: "jobs",
  //       //               foreignField: "client_id",
  //       //               localField: "_id",
  //       //               as: "postedJobs",
  //       //             },
  //       //           },
  //       //         ],
  //       //         as: "clientDetails",
  //       //       },
  //       //     },
  //       //     {
  //       //       $unwind: {
  //       //         path: "$clientDetails",
  //       //         preserveNullAndEmptyArrays: false,
  //       //       },
  //       //     }
  //       //   );
  //       //   Object.assign(projection, {
  //       //     clientDetails: {
  //       //       first_name: 1,
  //       //       last_name: 1,
  //       //       address: 1,
  //       //       postedJobs: {
  //       //         $size: "$clientDetails.postedJobs",
  //       //       },
  //       //       createdAt: 1,
  //       //     },
  //       //   });
  //       // }

  //       const item = await aggregateCollection(collection, [
  //         ...aggregation,
  //         {
  //           $match: condition,
  //         },
  //         {
  //           $project: projection,
  //         },
  //       ]);

  //       item.data = item.data.length > 0 ? item.data[0] : null;

  //       resolve(item);
  //     } catch (error) {
  //       reject(buildErrObject(422, error.message));
  //     }
  //   });
  // },

  async getJobDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data.job_id),
        };
        console.log(data);
        let aggregation = [
          {
            $lookup: {
              from: "jobcategories",
              foreignField: "_id",
              localField: "job_category_id",
              as: "jobCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$jobCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "client_id",
              foreignField: "_id",
              as: "client_details",
            },
          },
          {
            $unwind: {
              path: "$client_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobskills",
              foreignField: "_id",
              localField: "job_skills.job_skill_id",
              as: "jobSkills",
            },
          },
        ];

        let projection = {
          _id: 1,
          title: 1,
          is_wishlist: 1,
          description: 1,
          "jobCategoryDetails.name": 1,
          client_details: 1,
          jobSkills: {
            $map: {
              input: "$jobSkills",
              as: "jobSkills",
              in: "$$jobSkills.name",
            },
          },
          budget: 1,
          scope: 1,
          term: 1,
          createdAt: 1,
        };

        if (data.screen == "client-job-details") {
          aggregation.push({
            $lookup: {
              from: "jobproposals",
              let: {
                jobId: "$_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$job_id", "$$jobId"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "professional_id",
                    as: "professionalDetails",
                  },
                },
                {
                  $unwind: {
                    path: "$professionalDetails",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                {
                  $group: {
                    _id: "$status",
                    records: {
                      $push: "$$ROOT",
                    },
                  },
                },
              ],
              as: "proposals",
            },
          });
          Object.assign(projection, {
            proposals: {
              _id: 1,
              records: {
                _id: 1,
                payment_required_in: 1,
                milestones: 1,
                time_needed: 1,
                cover_letter: 1,
                status: 1,
                createdAt: 1,
                professionalDetails: {
                  first_name: 1,
                  last_name: 1,
                  profile_image: 1,
                  description: 1,
                  address: 1,
                },
              },
            },
          });
        } else if (data.screen == "professional-job-details") {
          aggregation.push(
            {
              $lookup: {
                from: "users",
                let: {
                  clientId: "$client_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$clientId"],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "jobs",
                      foreignField: "client_id",
                      localField: "_id",
                      as: "postedJobs",
                    },
                  },
                ],
                as: "clientDetails",
              },
            },
            {
              $lookup: {
                from: "jobproposals",
                let: {
                  jobId: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$job_id", "$$jobId"] },
                          { $eq: ["$professional_id", data.user_id] },
                        ],
                      },
                    },
                  },
                ],
                as: "submitproposal",
              },
            },

            {
              $unwind: {
                path: "$submitproposal",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$clientDetails",
                preserveNullAndEmptyArrays: false,
              },
            }
          );
          Object.assign(projection, {
            clientDetails: {
              first_name: 1,
              last_name: 1,
              address: 1,
              postedJobs: {
                $size: "$clientDetails.postedJobs",
              },
              createdAt: 1,
            },
            submitproposal: 1,
          });
        }

        const item = await aggregateCollection(collection, [
          ...aggregation,
          {
            $match: condition,
          },
          {
            $project: projection,
          },
        ]);

        item.data = item.data.length > 0 ? item.data[0] : null;
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async hasProfessionalAppliedToJob(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemCustom(
          collection,
          {
            professional_id: mongoose.Types.ObjectId(data.professional_id),
            job_id: mongoose.Types.ObjectId(data.job_id),
          },
          "_id"
        );

        resolve(item.data ? true : false);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServicePlans(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          service_sub_category_id: mongoose.Types.ObjectId(
            data.service_sub_category_id
          ),
          is_active: true,
        };

        const item = await getItemsCustom(
          collection,
          condition,
          "_id name description"
        );

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceFormTooltips(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemsCustom(collection, {}, "for content");

        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getDiscountStatus(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await aggregateCollection(collection, [
          {
            $match: {
              country_id: mongoose.Types.ObjectId("6396c92f7ed594d74974aa4f"), // india for now
              "services.service_sub_category_id": mongoose.Types.ObjectId(
                data.service_sub_category_id
              ),
            },
          },
          {
            $lookup: {
              from: "textypes",
              foreignField: "_id",
              localField: "services.tex_type_id",
              as: "tex_type_id",
            },
          },
          // {
          //   $unwind: "$tex_type_id",
          // },
          {
            $unwind: "$services",
          },
          // {
          //   $project: {
          //     discount: "$services.discount",
          //   },
          // },
        ]);
        item.data = item.data.length > 0 ? item.data[0] : null;
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getServiceFees(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await aggregateCollection(collection, [
          {
            $match: {
              country_id: mongoose.Types.ObjectId("6396c92f7ed594d74974aa4f"), // india for now
              "services.service_sub_category_id": mongoose.Types.ObjectId(
                data.service_sub_category_id
              ),
            },
          },
          {
            $unwind: "$services",
          },
          {
            $project: {
              fees: "$services.commission",
            },
          },
        ]);

        item.data = item.data.length > 0 ? item.data[0] : null;
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async jobPlatformCommission(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await model.findOne({
          "country_obj.isoCode": data.info.country.toUpperCase(),
        });

        resolve(result);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getJobProposals(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          job_id: data.job_id,
          // professional_id : data.user_id
        };

        // const list = await model
        //   .find(condition)
        //   .limit(data.limit ? Number(data.limit) : 10)
        //   .skip(data.offset ? Number(data.offset) : 0)
        //   .populate("professional_id");

        const list = await model.aggregate([
          {
            $lookup: {
              from: "jobproposalcontracts",
              foreignField: "proposal_id",
              localField: "_id",
              as: "contractDetails",
            },
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "professional_id",
              as: "professional_id",
            },
          },
          {
            $unwind: {
              path: "$contractDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: { job_id: mongoose.Types.ObjectId(data.job_id) },
          },
          {
            $skip: data.offset ? Number(data.offset) : 0,
          },
          {
            $limit: data.limit ? Number(data.limit) : 10,
          },
        ]);

        console.log("data.jod)id", data.job_id);

        const count = await model.countDocuments(condition);

        resolve({
          list: list,
          count: count,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getJobProposalDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: data.proposal_id,
        };
        const details = await model.findOne(condition).populate("job_id");
        resolve(details);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getBlogs(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          "countryDetails.isoCode": data.info.country_code,
        };

        var agg = [
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "countryDetails",
            },
          },
          {
            $unwind: {
              path: "$countryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const blogs = await aggregateCollection(collection, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(collection, agg);

        // console.log(blogs)

        resolve({
          list: blogs.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getBlogDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        /*const details = await model.findOne({
          _id : data.blog_id
        });*/

        const condition = {
          _id: mongoose.Types.ObjectId(data.blog_id),
        };

        var agg = [
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "countryDetails",
            },
          },
          {
            $unwind: {
              path: "$countryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_category_id",
              foreignField: "_id",
              as: "serviceCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "serviceDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "service_sub_category_id",
              foreignField: "_id",
              as: "serviceSubCategoryDetails",
            },
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $limit: 1,
          },
        ];

        const blogs = await aggregateCollection(model, agg);

        resolve(blogs.data.length ? blogs.data[0] : null);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getClientJobProposals(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          user_id: mongoose.Types.ObjectId(data.user_id),
        };

        if (data.search) {
          condition["$or"] = [
            {
              "professionalDetails.first_name": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.last_name": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.description": new RegExp(data.search, "i"),
            },
            {
              "professionalDetails.company_details.name": new RegExp(
                data.search,
                "i"
              ),
            },
          ];
        }

        if (data.contract_type) {
          condition["proposalDetails.payment_required_in"] = data.contract_type;
        }

        if (data.contract_status) {
          condition.contract_status = data.contract_status;
        }

        if (data.milestone_status) {
          condition.milestone_status = data.milestone_status;
        }

        if (data.escrow_refund_status) {
          condition.escrow_refund_status = data.escrow_refund_status;
        }

        if (data.contract_start_Startdate && data.contract_start_Enddate) {
          const CONTRACT_START_StartDate = new Date(
            moment(data.contract_start_Startdate).utc().startOf("day")
          );
          const CONTRACT_Start_ENDDate = new Date(
            moment(data.contract_start_Enddate).utc().endOf("day")
          );

          condition.contract_start_date = {
            $gte: CONTRACT_START_StartDate,
            $lte: CONTRACT_Start_ENDDate,
          };
        }

        if (data.contract_end_Startdate || data.contract_end_Enddate) {
          const CONTRACT_End_StartDate = moment(data.contract_end_Startdate)
            .utc()
            .startOf("day");
          const CONTRACT_End_ENDDate = moment(data.contract_end_Enddate)
            .utc()
            .endOf("day");

          condition.contract_end_date = {
            $gte: CONTRACT_End_StartDate,
            $lte: CONTRACT_End_ENDDate,
          };
        }

        // if(data.freelancer){
        //   condition["professionalDetails.first_name"] = data.freelancer;
        // }

        console.log("condition", condition);

        const sortBy = {};
        if (data.sort == "ascending" && data.filter == "freelancer") {
          sortBy["professionalDetails.first_name"] = 1;
        } else if (data.sort == "descending" && data.filter == "freelancer") {
          sortBy["professionalDetails.first_name"] = -1;
        } else if (data.sort == "ascending" && data.filter == "contract_name") {
          sortBy["jobDetails.title"] = 1;
        } else if (
          data.sort == "descending" &&
          data.filter == "contract_name"
        ) {
          sortBy["jobDetails.title"] = -1;
        } else {
          sortBy.createdAt = -1;
        }

        var agg = [
          // {
          //   $sort: {
          //     createdAt: -1,
          //   },
          // },
          {
            $lookup: {
              from: "users",
              localField: "professional_id",
              foreignField: "_id",
              as: "professionalDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "clientDetails",
            },
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobproposals",
              localField: "proposal_id",
              foreignField: "_id",
              as: "proposalDetails",
            },
          },
          {
            $unwind: {
              path: "$proposalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          {
            $unwind: {
              path: "$jobDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $sort: sortBy,
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const blogs = await aggregateCollection(collection, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(collection, agg);

        console.log(blogs);

        resolve({
          list: blogs.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getProfessionalContracts(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          professional_id: mongoose.Types.ObjectId(data.user_id),
        };

        if (data.search) {
          condition["$or"] = [
            {
              "clientDetails.first_name": new RegExp(data.search, "i"),
            },
            {
              "clientDetails.last_name": new RegExp(data.search, "i"),
            },

            //  Search Removed By Om Gumber
            // {
            //   "clientDetails.description": new RegExp(data.search, "i"),
            // },
          ];
        }

        // if (data.contract_type) {
        //   condition["proposalDetails.payment_required_in"] = data.contract_type;
        // }

        if (data.contract_type) {
          condition["proposalDetails.payment_required_in"] = data.contract_type;
        }

        if (data.contract_status) {
          condition.contract_status = data.contract_status;
        }

        if (data.milestone_status) {
          condition.milestone_status = data.milestone_status;
        }

        if (data.escrow_refund_status) {
          condition.escrow_refund_status = data.escrow_refund_status;
        }

        if (data.contract_start_Startdate && data.contract_start_Enddate) {
          const CONTRACT_START_StartDate = new Date(
            moment(data.contract_start_Startdate).utc().startOf("day")
          );
          const CONTRACT_Start_ENDDate = new Date(
            moment(data.contract_start_Enddate).utc().endOf("day")
          );

          condition.contract_start_date = {
            $gte: CONTRACT_START_StartDate,
            $lte: CONTRACT_Start_ENDDate,
          };
        }

        if (data.contract_end_Startdate || data.contract_end_Enddate) {
          const CONTRACT_End_StartDate = moment(data.contract_end_Startdate)
            .utc()
            .startOf("day");
          const CONTRACT_End_ENDDate = moment(data.contract_end_Enddate)
            .utc()
            .endOf("day");

          condition.contract_end_date = {
            $gte: CONTRACT_End_StartDate,
            $lte: CONTRACT_End_ENDDate,
          };
        }

        // if(data.freelancer){
        //   condition["professionalDetails.first_name"] = data.freelancer;
        // }

        console.log("condition", condition);

        const sortBy = {};
        if (data.sort == "ascending" && data.filter == "freelancer") {
          sortBy["professionalDetails.first_name"] = 1;
        } else if (data.sort == "descending" && data.filter == "freelancer") {
          sortBy["professionalDetails.first_name"] = -1;
        } else if (data.sort == "ascending" && data.filter == "contract_name") {
          sortBy["jobDetails.title"] = 1;
        } else if (
          data.sort == "descending" &&
          data.filter == "contract_name"
        ) {
          sortBy["jobDetails.title"] = -1;
        } else {
          sortBy.createdAt = -1;
        }

        var agg = [
          {
            $match: condition,
          },
          {
            $sort: sortBy,
          },
          {
            $lookup: {
              from: "users",
              localField: "professional_id",
              foreignField: "_id",
              as: "professionalDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "clientDetails",
            },
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobproposals",
              localField: "proposal_id",
              foreignField: "_id",
              as: "proposalDetails",
            },
          },
          {
            $unwind: {
              path: "$proposalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobproposalcontractactivities",
              localField: "_id",
              foreignField: "job_proposal_contract_id",
              as: "job_proposal_contract_Detail",
            },
          },
          {
            $unwind: {
              path: "$job_proposal_contract_Detail",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          {
            $unwind: {
              path: "$jobDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const blogs = await aggregateCollection(collection, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(collection, agg);

        console.log(blogs);

        resolve({
          list: blogs.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getCareerJobs(collection, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      console.log(data, "<-- data");

      try {
        const condition = {};

        if (data.job_category_id) {
          condition.$and = [
            {
              "jobCategoryDetails._id": mongoose.Types.ObjectId(
                data.job_category_id
              ),
            },
          ];
        }
        // else
        // {
        //   condition.title = new RegExp(data.search, "i")
        // }
        if (data.search) {
          condition.$or = [
            { "self_jobs.title": { $regex: data.search, $options: "i" } },
          ];
        }

        var agg = [
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "countryDetails",
            },
          },
          {
            $unwind: {
              path: "$countryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobcategories",
              localField: "job_category_id",
              foreignField: "_id",
              as: "jobCategoryDetails",
            },
          },

          /* {
            $lookup: {
              from: 'careerjobs',
              localField: 'job_category_id',
              foreignField: 'job_category_id',
              as: "self_jobs"
            }
          },*/
          {
            $lookup: {
              from: "careerjobs",
              let: {
                job_category_id: "$job_category_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$job_category_id", "$$job_category_id"],
                    },
                  },
                },
                {
                  $lookup: {
                    from: "countries",
                    localField: "country_id",
                    foreignField: "_id",
                    as: "countryDetails",
                  },
                },
                {
                  $unwind: {
                    path: "$countryDetails",
                    preserveNullAndEmptyArrays: true,
                  },
                },

                /*{
                  $limit: 1
                }*/
              ],
              as: "self_jobs",
            },
          },

          {
            $unwind: {
              path: "$jobCategoryDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: "$job_category_id", // Group key
              total_jobs: { $sum: 1 },
              jobCategoryDetails: {
                $first: "$jobCategoryDetails",
              },
              self_jobs: {
                $first: "$self_jobs",
              },
            },
          },
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },

          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const jobs = await aggregateCollection(collection, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(collection, agg);

        console.log(jobs);

        resolve({
          list: jobs.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async jobHireProfessional(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const isExistContract = await model.JobProposalContract.findOne({
          job_id: data.job._id,
          professional_id: data.proposal.professional_id,
          user_id: data.job.client_id,
          proposal_id: data.proposal_id,
        });

        if (isExistContract) {
          reject(buildErrObject(422, "Contract already exist"));
          return;
        }

        var contract_start_date = data.proposal.milestones.length
          ? data.proposal.milestones[0].due_date
          : null;
        var contract_end_date = data.proposal.milestones.length
          ? data.proposal.milestones[data.proposal.milestones.length - 1]
              .due_date
          : null;

        console.log(data.job);

        const contract = await model.JobProposalContract.create({
          job_id: data.job._id,
          professional_id: data.proposal.professional_id,
          user_id: data.job.client_id,
          proposal_id: data.proposal_id,
          contract_start_date: contract_start_date,
          contract_end_date: contract_end_date,
        });

        if (contract) {
          const update_Is_Hired_Status = await model.JobProposal.updateOne(
            { _id: data.proposal_id },
            {
              $set: {
                is_hired: true,
                contract_id: contract._id,
              },
            }
          );
        }

        resolve(contract);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getContractDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = data.condition;

        var agg = [
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "professional_id",
              foreignField: "_id",
              as: "professionalDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "clientDetails",
            },
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobproposals",
              localField: "proposal_id",
              foreignField: "_id",
              as: "proposalDetails",
            },
          },
          {
            $unwind: {
              path: "$proposalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          {
            $unwind: {
              path: "$jobDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $limit: 1,
          },
        ];

        const result = await aggregateCollection(collection, agg);

        console.log(result);

        resolve(result.data.length ? result.data[0] : null);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getCareerJobsDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const job = await model
          .findOne({
            _id: data.career_job_id,
          })
          .populate([
            {
              path: "country_id",
            },
            {
              path: "job_category_id",
            },
          ]);
        resolve(job);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async applyCareerJob(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const added = await model.create({
          career_job_id: data.career_job_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          location: data.location,
          resume: data.resume,
          phone: data.phone,
          user_id: data.user_id,
        });

        resolve(added);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getContractMilestonePaymentDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const list = await model.find({
          job_proposal_contract_id: data.contract_id,
        });
        resolve(list);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async addClientProposalMilestone(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const proposal = await model.findOne({
          _id: data.proposal_id,
        });

        if (!proposal) {
          reject(buildErrObject(422, "Proposal not found"));
          return;
        }

        proposal.milestones.push({
          description: data.description,
          due_date: data.due_date,
          amount: data.amount,
        });
        proposal.markModified("milestones");
        await proposal.save();

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getRecommendedServices(model) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await model.find({}).populate("service_id");
        resolve({
          code: 200,
          data: item,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async sendMileStoneReview(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const isExist = await model.findOne({
          job_proposal_contract_id: data.contract_id,
          milestone_id: data.milestone_id,
        });

        const obj = {
          professional_id: data.proposal.professional_id,
          user_id: data.contract.user_id,
          job_proposal_contract_id: data.contract_id,
          milestone_id: data.milestone_id,
          amount: data.amount,
          message: data.message,
          work_proof: data.work_proof,
        };

        if (isExist) {
          await isExist.updateOne(obj);
        } else {
          await model.create(obj);
        }

        resolve(true);
      } catch (err) {
        console.log(err);
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async sendQuoteMileStoneReview(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const isExist = await model.findOne({
          _id: data.quote_id,
          "offer.milestone_id": data.milestone_id,
        });

        const obj = {
          // professional_id: data.proposal.professional_id,
          // user_id: data.contract.user_id,
          // job_proposal_contract_id: data.contract_id,
          milestone_id: data.milestone_id,
          amount: data.amount,
          message: data.message,
          quote_id: data.quote._id,
          // work_proof: data.work_proof,
        };

        if (isExist) {
          await isExist.updateOne(obj);
        } else {
          await model.create(obj);
        }

        resolve(true);
      } catch (err) {
        console.log(err);
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async sendContractReview(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const isExist = await model.findOne({
          job_proposal_contract_id: data.contract_id,
          // milestone_id: data.milestone_id,
        });

        const obj = {
          professional_id: data.proposal.professional_id,
          user_id: data.contract.user_id,
          job_proposal_contract_id: data.contract_id,
          // milestone_id: data.milestone_id,
          amount: data.amount,
          message: data.message,
          work_proof: data.work_proof,
          contract_status: "request_submitted",
        };

        if (isExist) {
          await isExist.updateOne(obj);
        } else {
          await model.create(obj);
        }

        resolve(true);
      } catch (err) {
        console.log(err);
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getMilestoneReview(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const list = await model.find({
          job_proposal_contract_id: data.contract_id,
        });

        resolve(list);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getQuoteMilestoneReview(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const list = await model.find({
          quote_id: data.quote_id,
        });

        resolve(list);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getMilestoneReviewDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Ouote_id", data.review_id);
        const details = await model.findOne({
          quote_id: mongoose.Types.ObjectId(data.review_id),
        });

        // if(!details) throw buildErrObject(422, 'Record Not Found')

        resolve(details);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async acceptRejectMilestone(model, model2, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const updateObj = {
          client_status: data.client_status,
        };

        if (data.client_status == "disapproved") {
          updateObj.disapproved_reason = data.disapproved_reason;
        } else {
          // change milestone to completed status
          await model2.update(
            {
              "offer.milestones._id": data.milestone_id,
              _id: mongoose.Types.ObjectId(data.quote_id),
            },
            {
              $set: {
                "offer.milestones.$.status": "completed",
              },
            }
          );
        }

        // We have to release payment here after approved

        await model.update(
          {
            quote_id: data.quote_id,
            milestone_id: data.milestone_id,
          },
          {
            $set: updateObj,
          }
        );

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async acceptRejectQuoteMilestone(model, model2, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const updateObj = {
          client_status: data.client_status,
        };

        if (data.client_status == "disapproved") {
          updateObj.disapproved_reason = data.disapproved_reason;
        } else {
          // change milestone to completed status
          await model2.update(
            { "offer.milestones._id": data.milestone_id },
            {
              $set: {
                "offer.milestones.$.status": "completed",
              },
            }
          );
        }

        // We have to release payment here after approved

        await model.update(
          {
            quote_id: data.quote_id,
            milestone_id: data.milestone_id,
          },
          {
            $set: updateObj,
          }
        );

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async startMilestone(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        await model.update(
          { "milestones._id": data.milestone_id },
          {
            $set: {
              "milestones.$.status": "active",
            },
          }
        );

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async startQuotesMilestone(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        await model.update(
          { "offer.milestones._id": data.milestone_id },
          {
            $set: {
              "offer.milestones.$.status": "active",
            },
          }
        );

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async jobProposalFeedback(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const obj = {
          job_id: data.job._id,
          professional_id: data.contract.professional_id,
          user_id: data.contract.user_id,
          proposal_id: data.proposal._id,
          job_proposal_contract_id: data.contract_id,
          recommended_points: data.recommended_points,
          reason_for_end_contract: data.reason_for_end_contract,
          rating: {
            skills: data.skills,
            quality: data.quality,
            availibility: data.availibility,
            adherence_to_schedule: data.adherence_to_schedule,
            communication: data.communication,
            co_operation: data.co_operation,
          },
          overall_rating: data.overall_rating,
          message: data.message,
        };

        console.log("obj", obj);

        const isExist = await model.findOne({
          job_proposal_contract_id: data.contract_id,
        });

        if (isExist) {
          await isExist.update(obj);
        } else {
          await model.create(obj);
        }

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getProposalFeedback(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        /*const obj = {
          job_id: data.job._id,
          professional_id: data.contract.professional_id,
          user_id: data.contract.user_id,
          proposal_id: data.proposal._id,
          job_proposal_contract_id: data.contract_id,
          rating: {
            skills: data.skills,
            quality: data.quality,
            availibility: data.availibility,
            adherence_to_schedule: data.adherence_to_schedule,
            communication: data.communication,
            co_operation: data.co_operation,
          },
          overall_rating: data.overall_rating,
          message: data.message,
        }*/

        const isExist = await model.findOne({
          job_proposal_contract_id: data.contract_id,
        });

        resolve(isExist);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async popularProfessionalServices(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        var arr = [
          {
            $lookup: {
              from: "professionalservices",
              localField: "service_id",
              foreignField: "_id",
              as: "service_details",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "service_details.professional_id",
              foreignField: "_id",
              as: "professional_details",
            },
          },
          {
            $unwind: {
              path: "$professional_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$service_details",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];
        const isExist = await aggregateCollection(model, arr);

        resolve(isExist);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async becomeProfessional(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        data.role = "Professional";
        const user = await model.findById(data.user_id);
        console.log(user);
        const isExistRole = user.availabeRoles.find(
          (item) => item == data.role
        );
        if (!isExistRole) {
          user.availabeRoles.push(data.role);
          user.markModified("availabeRoles");
          await user.save();
        }
        // https://stackoverflow.com/a/44657680/10226276
        await model.findByIdAndUpdate(
          { _id: data.user_id },
          { $set: { role: data.role } },
          { overwriteDiscriminatorKey: true, new: true }
        );
        // const flag = await model.updateOne({_id: data.user_id}, {$set : { role: data.role }});
        // console.log(data.user_id)
        // console.log(flag)
        // await model.create({ _id: data.user_id }, { $set: { role: data.role } }, { overwriteDiscriminatorKey: true, new: true });
        // console.log(user)
        resolve(true);
      } catch (err) {
        console.log(err);
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async becomeClient(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        data.role = "Client";
        const user = await model.findById(data.user_id);
        console.log("user", user);
        const isExistRole = user.availabeRoles.find(
          (item) => item == data.role
        );
        console.log("isExistRole----->", isExistRole);
        if (!isExistRole) {
          user.availabeRoles.push(data.role);
          user.markModified("availabeRoles");
          console.log("Role pushed");
          await user.save();
        }
        await model.findByIdAndUpdate(
          { _id: data.user_id },
          { $set: { role: data.role } },
          { overwriteDiscriminatorKey: true, new: true }
        );

        // console.log(user)
        resolve(true);
      } catch (err) {
        console.log(err);
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getProfesionals(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condiLookup = {};
        const arr = [];
        const condition = {
          availabeRoles: {
            $in: ["Professional"],
          },
          approved_as_professional: "approved",
        };

        // console.log(convertToObjectIds(data.languages.split(",")))

        if (data.languages) {
          const ids = await convertToObjectIds(data.languages.split(","));
          condition["languages.language_id"] = {
            $in: ids,
          };
        }

        if (data.hasOwnProperty("overall_ratings")) {
          condiLookup.overall_ratings = {
            $gte: Number(data.overall_ratings),
            $lt: Number(data.overall_ratings) + 0.5,
          };
        }

        // if (data.service_id) {
        //   condiLookup.services = {
        //     $elemMatch: {
        //       service_id: mongoose.Types.ObjectId(data.service_category_id),
        //     },
        //   };
        // }
        if (data.service_category_id) {
          condition["services.service_category_id"] = mongoose.Types.ObjectId(
            data.service_category_id
          );
        }

        if (data.search) {
          condition.$or = [
            {
              username: { $regex: data.search, $options: "-i" },
            },
            // {
            //   last_name: { $regex: data.search, $options: "-i" },
            // },
          ];
        }

        if (data.longitude && data.latitude) {
          condition.distance = {
            $lte: data.radius ? Number(data.radius) : 50,
          };
        }

        if (data.top_rated_professional == "true") {
          condiLookup.total_ratings = { $ne: 0 };
        }

        console.log(condition);
        // console.log("condiLookup---->", condiLookup);

        // var geonear = {}

        const agg = [
          {
            $match: condition,
          },
          {
            $lookup: {
              from: "countries",
              localField: "company_details.country",
              foreignField: "_id",
              as: "company_country",
            },
          },
          {
            $unwind: {
              path: "$company_country",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "professionalratings",
              localField: "_id",
              foreignField: "professional_id",
              as: "professional_ratings",
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "company_details.industry_id",
              foreignField: "_id",
              as: "company_industry",
            },
          },
          // {
          //   $group:{
          //    _id: "_id",
          //     avgRating: { $avg: "$rating" },
          //        // countRating : {$sum:"$rating"}
          //   }
          // },
          // {
          //   $sort:{
          //     avgRating:-1
          //   }

          // },
          {
            $unwind: {
              path: "$company_industry",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $project: {
              first_name: 1,
              last_name: 1,
              username: 1,
              email: 1,
              approved_as_professional: 1,
              social_id: 1,
              login_type: 1,
              two_step_verification: 1,
              availabeRoles: 1,
              status: 1,
              notification_settings: 1,
              createdAt: 1,
              profile_image: 1,
              address: 1,
              description: 1,
              languages: 1,
              last_step: 1,
              profile_percentage: 1,
              proof_of_address: 1,
              proof_of_identity: 1,
              certification: 1,
              company_details: 1,
              education: 1,
              has_company: 1,
              website: 1,
              services: 1,
              approved_by_admin: 1,
              basic_profile_completed: 1,
              loc: 1,
              distance: 1,
              overall_ratings: {
                $avg: "$professional_ratings.rating",
              },
              total_ratings: {
                $size: "$professional_ratings",
              },
            },
          },

          {
            $match: condiLookup,
          },
          {
            $sort: {
              total_ratings: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        if (data.longitude && data.latitude) {
          // CoordinatesConditions.near = {
          //   type: "Point",
          //   coordinates :[+data.longitude, +data.latitude]
          // }

          agg.unshift({
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [Number(data.longitude), Number(data.latitude)],
              },
              // key : "loc",
              distanceField: "distance",
              spherical: true,
              // maxDistance: 10* 1000,
              // includeLocs: "address.complete_address.location",
              includeLocs: "loc",
            },
          });
        }
        console.log("Agg--------->", agg);
        let profiles = await aggregateCollection(collection, agg);
        // profile.data = profile.data.length > 0 ? profile.data[0] : null

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(collection, agg);

        // console.log("In the list.....");

        resolve({
          list: profiles.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async createQuote(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const added = await model.create({
          user_id: data.user_id,
          professional_id: data.professional_id,
          message: data.message,
          attachments: data.attachments,
          budget: data.budget,
          delivery_time: data.delivery_time,
        });

        resolve(added);
      } catch (err) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  // async createQuoteRoom(model, data){
  //   return new Promise(async (resolve, reject) => {

  //     try{

  //       const added = await model.create({
  //         room_id : uuid.v4(),
  //         sender_id : data.user_id,
  //         receiver_id : data.professional_id,
  //         quote_id : data.quote._id,
  //       })

  //       resolve(added);

  //     }catch(err){
  //       reject(buildErrObject(422, error.message));
  //     }

  //   })
  // },

  async createRoom(model, body) {
    return new Promise(async (resolve, reject) => {
      try {
        var resp = await model.findOne({
          $or: [
            {
              $and: [
                {
                  sender_id: body.sender_id,
                },
                {
                  receiver_id: body.receiver_id,
                },
              ],
            },
            {
              $and: [
                {
                  receiver_id: body.sender_id,
                },
                {
                  sender_id: body.receiver_id,
                },
              ],
            },
          ],
        });

        if (resp) {
          console.log("Response", resp);
        } else {
          resp = await model.create({
            room_id: uuid.v4(),
            sender_id: body.sender_id,
            receiver_id: body.receiver_id,
            // appointment_id: body.appointment_id,
            // room_type: "individual",
          });
          console.log("dfgdfdfdfdfdfdfdfdfdfd");
          // resolve(added);
        }

        const detail = await model.aggregate([
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: {
              path: "$senderDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $unwind: {
              path: "$receiverDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              _id: mongoose.Types.ObjectId(resp._id),
            },
          },
        ]);

        resolve(detail[0]);
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async createChatRoom(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const added = await model.create({
          room_id: uuid.v4(),
          sender_id: data.user_id,
          receiver_id: data.professional_id,
        });

        resolve(added);
      } catch (err) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async createChatMessage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const added = await model.create({
          room_id: data.room_data.room_id,
          primary_room_id: data.room_data._id,
          message: data.message,
          message_type: "quote",
          quote_id: data.quote._id,
          sender_id: data.user_id,
          receiver_id: data.professional_id,
          date: new Date(),
          attachments: data.attachments,
        });

        resolve(added);
      } catch (err) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async createMessage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const added = await model.create({
          room_id: data.room_data.room_id,
          primary_room_id: data.room_data._id,
          message: data.message,
          message_type: "media",
          sender_id: data.user_id,
          receiver_id: data.professional_id,
          date: new Date(),
          attachments: data.attachments,
        });

        resolve(added);
      } catch (err) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getMessages(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let matchObj = {
          // is_Delete_from_sender : false,
          primary_room_id: mongoose.Types.ObjectId(data.room_id),
          clearChat: { $nin: [mongoose.Types.ObjectId(data.user_id)] },
          $or: [
            {
              sender_id: mongoose.Types.ObjectId(data.user_id),
            },
            {
              receiver_id: mongoose.Types.ObjectId(data.user_id),
            },
          ],
        };

        console.log("matchObj: ", matchObj);

        var agg = [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $unwind: "$receiverDetails",
          },
          {
            $lookup: {
              from: "quotes",
              foreignField: "_id",
              localField: "quote_id",
              as: "quoteDetails",
            },
          },
          {
            $unwind: {
              path: "$quoteDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              createdAt: 1,
            },
          },
          {
            $match: matchObj,
          },
          {
            $skip: Number(data.offset ? data.offset : 0),
          },
          {
            $limit: Number(data.limit ? data.limit : 10),
          },
        ];

        let chats = await model.aggregate(agg);

        const limitIndex = agg.findIndex((item) => item.$limit >= 0);
        const skipIndex = agg.findIndex((item) => item.$skip >= 0);

        // remove limit and offset
        agg = agg.filter(function (value, index) {
          return [limitIndex, skipIndex].indexOf(index) == -1;
        });

        // add $count
        agg.push({
          $count: "createdAt",
        });

        let total = await model.aggregate(agg);
        result = await model.updateOne(
          {
            room_id: data.room_id,
            unread: { $in: [data.user_id] },
          },
          {
            $pull: { unread: data.user_id },
          }
        );
        resolve({
          chats: chats,
          count: total.length ? total[0].createdAt : 0,
        });
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getDisputeChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let matchObj = {
          // is_Delete_from_sender : false,
          primary_room_id: mongoose.Types.ObjectId(data.room_id),
          is_dispute_message: true,
          booking_id: mongoose.Types.ObjectId(data.booking_id),
          clearChat: { $nin: [mongoose.Types.ObjectId(data.user_id)] },
          $or: [
            {
              sender_id: mongoose.Types.ObjectId(data.user_id),
            },
            {
              receiver_id: mongoose.Types.ObjectId(data.user_id),
            },
          ],
        };

        console.log("matchObj: ", matchObj);

        var agg = [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $unwind: "$receiverDetails",
          },
          {
            $lookup: {
              from: "quotes",
              foreignField: "_id",
              localField: "quote_id",
              as: "quoteDetails",
            },
          },
          {
            $unwind: {
              path: "$quoteDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              createdAt: 1,
            },
          },
          {
            $match: matchObj,
          },
          {
            $skip: Number(data.offset ? data.offset : 0),
          },
          {
            $limit: Number(data.limit ? data.limit : 10),
          },
        ];

        let chats = await model.aggregate(agg);

        const limitIndex = agg.findIndex((item) => item.$limit >= 0);
        const skipIndex = agg.findIndex((item) => item.$skip >= 0);

        // remove limit and offset
        agg = agg.filter(function (value, index) {
          return [limitIndex, skipIndex].indexOf(index) == -1;
        });

        // add $count
        agg.push({
          $count: "createdAt",
        });

        let total = await model.aggregate(agg);
        result = await model.updateOne(
          {
            room_id: data.room_id,
            unread: { $in: [data.user_id] },
          },
          {
            $pull: { unread: data.user_id },
          }
        );
        resolve({
          chats: chats,
          count: total.length ? total[0].createdAt : 0,
        });
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getMessagesbyContractId(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let matchObj = {
          // is_Delete_from_sender : false,
          // primary_room_id: mongoose.Types.ObjectId(data.room_id),
          contract_id: mongoose.Types.ObjectId(data.contract_id),

          $or: [
            {
              sender_id: mongoose.Types.ObjectId(data.user_id),
            },
            {
              receiver_id: mongoose.Types.ObjectId(data.user_id),
            },
          ],
        };

        console.log("matchObj: ", matchObj);

        var agg = [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $unwind: "$receiverDetails",
          },
          {
            $lookup: {
              from: "quotes",
              foreignField: "_id",
              localField: "quote_id",
              as: "quoteDetails",
            },
          },
          {
            $unwind: {
              path: "$quoteDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              createdAt: 1,
            },
          },
          {
            $match: matchObj,
          },
          {
            $skip: Number(data.offset ? data.offset : 0),
          },
          {
            $limit: Number(data.limit ? data.limit : Number.MAX_SAFE_INTEGER),
          },
        ];

        let chats = await model.aggregate(agg);

        const limitIndex = agg.findIndex((item) => item.$limit >= 0);
        const skipIndex = agg.findIndex((item) => item.$skip >= 0);

        // remove limit and offset
        agg = agg.filter(function (value, index) {
          return [limitIndex, skipIndex].indexOf(index) == -1;
        });
        let total = await model.aggregate(agg);

        // add $count
        agg.push({
          $count: "createdAt",
        });

        resolve({
          chats: chats,
          count: total.length ? total[0].createdAt : 0,
        });
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getRooms(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let matchObj = {
          deletedAt: { $nin: [mongoose.Types.ObjectId(data.user_id)] },
          archive: { $nin: [mongoose.Types.ObjectId(data.user_id)] },
        };

        if (data.search && data.search != "") {
          var or = [
            {
              sender_id: mongoose.Types.ObjectId(data.user_id),
              $or: [
                { "receiverDetails.first_name": new RegExp(data.search, "i") },
                { "receiverDetails.last_name": new RegExp(data.search, "i") },
                { "latest_chat.message": new RegExp(data.search, "i") },
              ],
            },
            {
              receiver_id: mongoose.Types.ObjectId(data.user_id),
              $or: [
                { "senderDetails.first_name": new RegExp(data.search, "i") },
                { "senderDetails.last_name": new RegExp(data.search, "i") },
                { "latest_chat.message": new RegExp(data.search, "i") },
              ],
            },
          ];
        } else {
          var or = [
            {
              sender_id: mongoose.Types.ObjectId(data.user_id),
            },
            {
              receiver_id: mongoose.Types.ObjectId(data.user_id),
            },
          ];
        }

        // matchObj["$or"] = or;
        if (data.filter == "unread") {
          matchObj["$or"] = or;
          matchObj["read"] = { $in: [data.user_id] };
        } else if (data.filter == "starred") {
          matchObj["$or"] = or;
          matchObj["starred"] = { $in: [data.user_id] };
        } else if (data.filter == "archived") {
          matchObj["$or"] = or;
          matchObj["archive"] = { $in: [data.user_id] };
        } else if (data.filter == "block") {
          matchObj["$or"] = or;
          matchObj["$or"] = [{ "block.blocked_by": { $in: [data.user_id] } }];
        } else if (data.filter == "custom_offers") {
          matchObj["$or"] = or;
          matchObj["latest_chat.quote_id"] == { $exists: true };
        } else if (data.filter == "none") {
          matchObj["$or"] = or;
        }
        if (data.skill_id) {
          matchObj["senderDetails.skills"] = data.skill_id;
        }

        if (data.isSaved == "true") {
          matchObj["is_saved"] = {
            $in: [mongoose.Types.ObjectId(data.user_id)],
          };
        }

        const sortBy = {};
        if (data.sort == "newest") {
          sortBy.createdAt = -1;
        } else {
          sortBy["latest_chat.createdAt"] = -1;
          matchObj["latest_chat.seen"] = false;
        }
        console.log({
          $in: [
            "$unread",
            [mongoose.Types.ObjectId("635cbcce8b551112b2c9ad9a")],
          ],
        });
        var agg = [
          {
            $match: {
              // $and:[
              receiver_id: { $nin: ["$deletedAt"] },
              // {sender_id: {$nin : ['$deletedAt']}}
              // ]
            },
          },
          // $match: {
          //   $expr: {
          //     $or: [
          //       // 0 => individual, 1 => Group
          //       {
          //         sender_id: {$nin : ['$deletedAt']}
          //       },
          //       {

          //         receiver_id: {$nin : ['$deletedAt']}
          //       },
          //     ],
          //   },
          // },
          {
            $lookup: {
              from: "users",
              let: {
                sender_id: "$sender_id",
                receiver_id: "$receiver_id",
              },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$sender_id"] } } },
              ],
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "receiver_id",
              as: "receiverDetails",
            },
          },
          {
            $unwind: "$receiverDetails",
          },
          {
            $lookup: {
              from: "chats",
              let: { room_id: "$room_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$room_id", "$$room_id"] },
                        {
                          $eq: ["$unread", [data.user_id]],
                        },
                      ],
                    },
                  },
                },
                {
                  $sort: {
                    createdAt: -1,
                  },
                },
                // {
                //   $size: "unread_chats",
                // },
              ],
              as: "unread_chats",
            },
          },
          {
            $lookup: {
              from: "chats",
              let: { room_id: "$room_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        // 0 => individual, 1 => Group
                        { $and: [{ $eq: ["$room_id", "$$room_id"] }] },
                      ],
                    },
                  },
                },
                {
                  $sort: {
                    createdAt: -1,
                  },
                },

                {
                  $limit: 1,
                },
              ],
              as: "latest_chat",
            },
          },
          {
            $match: { receiver_id: { $nin: ["$latest_chat.deletedAt"] } },
          },
          {
            $unwind: {
              path: "$latest_chat",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: matchObj,
          },

          {
            $sort: sortBy,
          },
        ];

        let rooms = await model.aggregate(agg),
          rooms2 = [];

        // console.log("room",rooms);

        // if(matchObj["latest_chat"]){
        //   console.log("inside If Condition ", matchObj["latest_chat.deletedAt[0]"]);
        //   matchObj.receiver_id != matchObj["latest_chat.deletedAt[0]"]
        // }

        if (data.sort != "newest") {
          delete matchObj["latest_chat.seen"];

          let _idArr = [];
          if (rooms.length > 0) {
            _idArr = rooms.map((val) => mongoose.Types.ObjectId(val._id));
          }

          matchObj._id = { $nin: _idArr };
          // matchObj.sender_id = {$nin : [ mongoose.Types.ObjectId("632067a139ec78bd148ad848")]}
          console.log("matchObj", matchObj);
          rooms2 = await model.aggregate(agg);
        }

        resolve([...rooms, ...rooms2]);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getFAQs(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.type) {
          condition.type = data.type;
        }

        const faqs = await model.find(condition).sort({
          createdAt: -1,
        });

        resolve(faqs);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async sendQuoteOffer(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const quote = await model.findById(data.quote_id);

        if (data.offer_expire_days && Number(data.offer_expire_days) > 0) {
          data.offer_expire_date = moment().add(
            Number(data.offer_expire_days),
            "days"
          );
        } else {
          data.offer_expire_days = 0;
          data.offer_expire_date = null;
        }

        quote.offer = {
          professional_id: data.user_id,
          paid_type: data.paid_type,
          offer_description: data.offer_description,
          revisions: data.revisions,
          delivery: data.delivery,
          price: data.price,
          offer_expire_days: data.offer_expire_days,
          offer_expire_date: data.offer_expire_date,
          milestones: data.milestones,
        };

        quote.markModified("offer.milestones");

        await quote.save();

        resolve(true);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async sendOfferActivity(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const quote = await model.findOne({
          _id: data.quote_id,
        });

        if (data.status == "accepted") {
          // quote.offer.status = "accepted";
          // You have to pay first before accept the order
          return reject(
            buildErrObject(422, "Payment is required to accept the offer")
          );
        } else if (data.status == "rejected") {
          quote.offer.status = "rejected";
          quote.offer.rejected_reason = data.rejected_reason;
        } else {
          reject(buildErrObject(400, "Invalid status"));
          return;
        }

        await quote.save();

        resolve(quote);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async quoteOfferWithdraw(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const quote = await model.findOne({
          _id: data.quote_id,
        });

        quote.offer.status = "withdrawn";

        await quote.save();

        resolve(quote);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getQuestionList(model) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await model.find();
        resolve(item);
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getAllServicesList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          is_active: true,
        };

        if (data.search && data.search != "undefined") {
          condition.$or = [
            {
              name: new RegExp(data.search, "i"),
            },
          ];
        }

        var agg = [
          {
            $lookup: {
              from: "servicecategories",
              localField: "_id",
              foreignField: "service_id",
              as: "servicecategories_details",
            },
          },
          // {
          //   $unwind:{
          //     path:'$servicecategories_details',
          //     preserveNullAndEmptyArrays:true

          //   }
          // },
          {
            $match: condition,
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
        ];
        const item = await aggregateCollection(model, agg);
        item.count = await countDocuments(model, condition);
        resolve(item);
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getNotification(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          user_id: mongoose.Types.ObjectId(data.user_id),
          role: data.role,
        };

        if (data.is_seen == "false") {
          condition.is_seen = false;
        }
        var agg = [
          {
            $lookup: {
              from: "servicebookings",
              localField: "value_id",
              foreignField: "_id",
              as: "service_booking_details",
            },
          },
          {
            $unwind: {
              path: "$service_booking_details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const notifications = await aggregateCollection(model, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(model, agg);

        // console.log(notifications)

        resolve({
          list: notifications.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getProfessionalRatings(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          professional_id: mongoose.Types.ObjectId(data.professional_id),
        };

        if (data.search && data.search != "undefined") {
          condition.$or = [
            {
              review: new RegExp(data.search, "i"),
            },
            {
              "user_data.username": new RegExp(data.search, "i"),
            },
          ];
        }

        var sort = {};

        if (data.sort == "oldest_first") {
          sort.createdAt = 1;
        } else if (data.sort == "newest_first") {
          sort.createdAt = -1;
        } else if (data.sort == "highest_rated") {
          sort.rating = -1;
        } else if (data.sort == "most_liked") {
          sort.mostLiked = -1;
        } else if (data.sort == "none") {
          sort.createdAt = -1;
        } else {
          sort.createdAt = -1;
        }

        var agg = [
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "user_data",
            },
          },
          {
            $unwind: {
              path: "$user_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $addFields: {
              mostLiked: {
                $size: "$like_dislikes",
              },
            },
          },
          {
            $sort: sort,
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const notifications = await aggregateCollection(model, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(model, agg);

        // console.log(notifications)

        resolve({
          list: notifications.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getProfessionalServiceRatings(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          professional_service_id: mongoose.Types.ObjectId(
            data.professional_service_id
          ),
        };

        if (data.search && data.search != "undefined") {
          condition.$or = [
            {
              review: new RegExp(data.search, "i"),
            },
            {
              "user_data.username": new RegExp(data.search, "i"),
            },
          ];
        }

        var sort = {};

        if (data.sort == "oldest_first") {
          sort.createdAt = 1;
        } else if (data.sort == "newest_first") {
          sort.createdAt = -1;
        } else if (data.sort == "highest_rated") {
          sort.rating = -1;
        } else if (data.sort == "most_liked") {
          sort.mostLiked = -1;
        } else if (data.sort == "none") {
          sort.createdAt = -1;
        } else {
          sort.createdAt = -1;
        }

        var agg = [
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "user_data",
            },
          },
          {
            $unwind: {
              path: "$user_data",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition,
          },
          {
            $addFields: {
              mostLiked: {
                $size: "$like_dislikes",
              },
            },
          },
          {
            $sort: sort,
          },
          {
            $skip: data.offset ? +data.offset : 0,
          },
          {
            $limit: data.limit ? +data.limit : 10,
          },
        ];

        const notifications = await aggregateCollection(model, agg);

        // Now remove limit and offset
        const findLimit = agg.findIndex((item) =>
          item.hasOwnProperty("$limit")
        );
        agg.splice(findLimit, 1);
        const findOffset = agg.findIndex((item) =>
          item.hasOwnProperty("$offset")
        );
        agg.splice(findOffset, 1);

        agg.push({
          $count: "createdAt",
        });

        const count = await aggregateCollection(model, agg);

        // console.log(notifications)

        resolve({
          list: notifications.data,
          count: count.data.length ? count.data[0].createdAt : 0,
        });
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async getPopularLocation(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          status: "active",
        };

        if (data.search) {
          condition.name = new RegExp(data.search, "i");
        }

        const item = await getItemsCustom(
          model,
          condition,
          "",
          "",
          { createdAt: -1 },
          +data.limit,
          +data.offset
        );
        item.count = await countDocuments(model, condition);
        resolve(item);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getWishlist(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        // let projection = {
        //   _id: 1,
        //   professional_id: 1,
        //   title: 1,
        //   description: 1,
        //   // booking_ratings: 1,
        //   overall_ratings: {
        //     $avg: "$booking_ratings.rating",
        //   },
        //   total_ratings: {
        //     $size: "$booking_ratings",
        //   },
        //   service_id: 1,
        //   service_category_id: 1,
        //   // "single_plan.basic.price": 1,
        //   image: {
        //     $arrayElemAt: ["$images", 0],
        //   },
        //   "serviceDetails.name": 1,
        // };
        const result = await model.aggregate([
          {
            $lookup: {
              from: "bookingratings",
              localField: "professional_service_id",
              foreignField: "professional_service_id",
              as: "booking_ratings",
            },
          },
          {
            $lookup: {
              from: "professionalservices",
              localField: "professional_service_id",
              foreignField: "_id",
              as: "services_Details",
            },
          },

          {
            $unwind: {
              path: "$services_Details",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "professional_id",
              foreignField: "_id",
              as: "professionalDetails",
            },
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: true,
            },
          },

          // {
          //   $project: {
          //     overall_ratings: {
          //       $avg: "$booking_ratings.rating",
          //     },
          //     total_ratings: {
          //       $size: "$booking_ratings",
          //     },
          //     service_id: 1,
          //     service_category_id: 1,
          //     _id: 1,
          //     professional_id: 1,
          //     "services_Details.title": 1,
          //     "services_Details.description": 1,
          //     "services_Details.images": 1,
          //     // "services_Details.name" :1,
          //     // "professional_id" :1,
          //     // "_id": 1,
          //     // "title": 1,
          //     // "description": 1,
          //     // "service_id": 1,
          //     // "service_category_id": 1,
          //   },
          // },
        ]);
        resolve(result);
      } catch (err) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async professionalSearch(model, body) {
    return new Promise((resolve, reject) => {
      var query = {};
      if (body.search) {
        query.$or = [
          { first_name: new RegExp(body.search, "i") },
          { last_name: new RegExp(body.search, "i") },
        ];
      }
      // if (body.suggestions) {
      //   query.$or = [
      //     { first_name: { $regex: "^" + body.suggestions, $options: "i" } },
      //     { last_name: { $regex: "^" + body.suggestions, $options: "i" } },
      //   ];
      // }
      model
        .aggregate([
          {
            $match: query,
          },
          // {
          //   $skip: parseInt(body.offset)
          // },
          // {
          //   $limit: parseInt(body.limit)
          // }
        ])
        .then(async (data) => {
          resolve(data);
        })
        .catch((err) => {
          console.log(err);
          reject(buildErrObject(422, err.message));
        });
    });
  },

  async SearchInProfessionalService(model, data) {
    return new Promise(async (resolve, reject) => {
      var final = [];
      data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const condition = {
        // product_name: {
        //   $regex: new RegExp(data.search, "i"),
        // },
        approved_as_professional: "approved",
      };

      // var query = {};
      // if (body.search) {
      //   query.$or = [
      //     { first_name: new RegExp(body.search, "i") },
      //     { last_name: new RegExp(body.search, "i") },
      //   ];
      // }

      const professional = await model.User.aggregate([
        {
          $match: {
            $or: [
              { username: new RegExp(data.search, "i") },
              // { last_name: new RegExp(data.search, "i") },
            ],
          },
        },
        {
          $match: condition,
        },
        {
          $addFields: {
            result_type: "professional",
          },
        },
      ]);

      const professionalService = await model.ProfessionalService.aggregate([
        {
          $match: {
            $or: [
              // { description: new RegExp(data.search, "i") },
              { title: new RegExp(data.search, "i") },
            ],
          },
        },
        // {
        //   $match: condition,
        // },
        {
          $addFields: {
            result_type: "Service",
          },
        },
      ]);

      const service = await model.Service.aggregate([
        {
          $match: {
            $or: [{ name: new RegExp(data.search, "i") }],
          },
        },
        {
          $addFields: {
            result_type: "ServiceCategory",
          },
        },
      ]);

      const serviceCategory = await model.ServiceCategory.aggregate([
        {
          $match: {
            $or: [{ name: new RegExp(data.search, "i") }],
          },
        },
        {
          $addFields: {
            result_type: "ServiceSubCategory",
          },
        },
      ]);

      const serviceSubCategory = await model.ServiceSubCategory.aggregate([
        {
          $match: {
            $or: [{ name: new RegExp(data.search, "i") }],
          },
        },
        {
          $addFields: {
            result_type: "ServiceSubSubCategory",
          },
        },
      ]);

      final = [
        ...professional,
        ...service,
        ...serviceCategory,
        ...serviceSubCategory,
        ...professionalService,
      ];

      resolve(final);
    });
  },

  async getAccordingToType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        // if(data.type){
        //   condition.type = data.type;
        // }

        if (data.country_id) {
          condition.country_id = data.country_id;
        }

        if (data.service_id) {
          condition.service_id = data.service_id;
        }

        if (data.service_category_id) {
          condition.service_category_id = data.service_category_id;
        }

        if (data.service_sub_category_id) {
          condition.service_sub_category_id = data.service_sub_category_id;
        }

        const resp = await getItemsCustom(model, condition);

        resolve(resp);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async deleteChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const deleteChat = await model.updateMany(
          {
            room_id: data.room_id,
            deletedAt: { $nin: [data.user_id] },
          },
          {
            $push: { deletedAt: data.user_id },
          }
        );

        resolve(deleteChat);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async clearMessage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const clearChat = await model.updateMany(
          {
            room_id: data.room_id,
            clearChat: { $nin: [data.user_id] },
          },
          {
            $push: { clearChat: data.user_id },
          }
        );

        resolve(clearChat);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async blockUserChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const findCondi = {
          room_id: data.room_id,
          "block.blocked_by": { $in: [data.user_id] },
        };
        const updateQuery = {};
        const findRoom = await model.findOne(findCondi);

        if (findRoom) {
          updateQuery.$pull = {
            block: {
              blocked_by: data.user_id,
              blocked_to: data.receiver_id,
            },
          };
        } else {
          updateQuery.$push = {
            block: {
              blocked_by: data.user_id,
              blocked_to: data.receiver_id,
            },
          };
        }

        const blockUserChat = await model.updateOne(
          { room_id: data.room_id },
          updateQuery
        );

        resolve(blockUserChat);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getDownloadInvoice(data, res, model) {
    return new Promise(async (resolve, reject) => {
      try {
        const Payment_Detail = await model.findOne({
          _id: data.payment_id,
        });

        const contents = await fs.readFileSync(
          "./views/en/invoice.ejs",
          "utf8"
        );

        // const html = await ejs.render(contents, data);
        var html = await ejs.render(contents, {
          // logo: "data:image/png;base64," + base64Logo,
          order: Payment_Detail,
          // moment: moment,
          // BASE_URL: process.env.PUBLIC_BUCKET_URL,
          // dollarIndianLocale: dollarIndianLocale,
        });
        /*
         * Call a  user define method to generate PDF.
         */
        const fileName = "invoice-" + Date.now();
        const heading = "testing";
        var options = {
          format: "A4",
          width: "14in",
          orientation: "landscape",
          height: "21in",
          timeout: 540000,
        };

        await pdf
          .create(html, options)
          .toFile(
            "public_v1/invoice/" + fileName + ".pdf",
            async function (err, pdfV) {
              if (err) return console.log(err);
              console.log("here", pdfV);
              const fullPath =
                process.env.API_URL + "public_v1/invoice/" + fileName + ".pdf";
              console.log("filename===dsfs====>", fullPath);

              const filename = path.basename(fullPath);
              const contentType = mime.lookup(fullPath);

              res.setHeader(
                "Content-disposition",
                "attachment; filename=" + filename
              );
              res.setHeader("Content-type", contentType);

              const filestream = await fs.createReadStream(pdfV.filename);

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
              });
              filestream.on("close", () => {
                console.log("Stream closed now");
              });
              // }
            }
          );

        resolve(true);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async archiveChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const archive = await model.findOne({
          room_id: data.room_id,
          archive: { $nin: [data.user_id] },
        });
        console.log(archive);
        if (archive) {
          await model.updateOne(
            {
              _id: archive._id,
            },
            {
              $push: { archive: data.user_id },
            }
          );
        } else {
          await model.updateOne(
            {
              room_id: data.room_id,
              archive: { $in: [data.user_id] },
            },
            {
              $pull: { archive: data.user_id },
            }
          );
        }

        resolve(archive);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async readUnreadChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        var result;
        const read = await model.findOne({
          room_id: data.room_id,
          read: { $in: [data.user_id] },
        });
        console.log(read);
        if (read) {
          result = await model.updateOne(
            {
              _id: read._id,
            },
            {
              $pull: { read: data.user_id },
            }
          );
        } else {
          result = await model.updateOne(
            {
              room_id: data.room_id,
              read: { $nin: [data.user_id] },
            },
            {
              $push: { read: data.user_id },
            }
          );
        }
        console.log(result);
        resolve(result);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async starUnstarChat(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        var result;
        const starred = await model.findOne({
          room_id: data.room_id,
          starred: { $nin: [data.user_id] },
        });
        console.log(starred);
        if (starred) {
          result = await model.updateOne(
            {
              _id: starred._id,
            },
            {
              $push: { starred: data.user_id },
            }
          );
        } else {
          result = await model.updateOne(
            {
              room_id: data.room_id,
              starred: { $in: [data.user_id] },
            },
            {
              $pull: { starred: data.user_id },
            }
          );
        }
        console.log(result);
        resolve(result);
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getDestinationDepartureListAccToType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          type: data.type,
        };

        // if(data.type){
        //   condition.type = data.type;
        // }

        if (data.country_id) {
          condition.country_id = data.country_id;
        }

        if (data.service_id) {
          condition.service_id = data.service_id;
        }

        if (data.service_category_id) {
          condition.service_category_id = data.service_category_id;
        }

        console.log("conditions: ", condition);

        const resp = await getItemsCustom(model, condition);

        resolve(resp);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },

  async client(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        console.log(data)
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getInvoice(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data._id) {
          items = await getItemCustom(model, { _id: data.id }, "", "clientId");
          resolve(items);
        } else {
          let matchStage = {};
          if (data.search) {
            matchStage.$or = [
              {
                "client_details.firstName": {
                  $regex: data.search,
                  $options: "i",
                },
              },
              {
                "client_details.lastName": {
                  $regex: data.search,
                  $options: "i",
                },
              }, // Search by client name
              { regNumber: { $regex: data.search, $options: "i" } }, // Search by registration number
            ];
          }

          if (data.start_date && data.end_date) {
            matchStage["createdAt"] = {
              $gte: new Date(data.start_date),
              $lte: new Date(data.end_date),
            };
          }

          let condition = { user_id: mongoose.Types.ObjectId(data.user_id) },
            aggregationPipeline = [],
            sort = data.sortBy === "old" ? { createdAt: 1 } : { createdAt: -1 };

          if (data.status === "all") {
          } else if (data.id) {
            condition._id = mongoose.Types.ObjectId(data.id);
          } else if (data.minAmount && data.maxAmount) {
            // Add condition to filter by total amount range
            condition.total = {
              $gte: data.minAmount,
              $lte: data.maxAmount,
            };
          } else if (
            ["unpaid", "partially_paid", "fully_paid"].includes(data.status)
          )
            //  else if (data.min !== undefined) {
            //   // Add condition to filter by minimum total amount
            //   condition.total_amount = {
            //     $gte: data.minAmount,
            //   };
            // } else if (data.max !== undefined ) {
            //   // Add condition to filter by maximum total amount
            //   condition.total_amount = {
            //     $lte: data.maxAmount,
            //   };
            // }
            condition.status = data.status;
          const arr = [
            {
              $match: condition,
            },
            {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client_details",
              },
            },
            {
              $unwind: "$client_details",
            },
            {
              $match: matchStage,
            },
            {
              $lookup: {
                from: "quotes",
                localField: "quotation_id",
                foreignField: "_id",
                as: "quotation_details",
              },
            },
            {
              $unwind: "$quotation_details",
            },

            {
              $lookup: {
                from: "carlogos",
                localField: "quotation_details.type_of_car",
                foreignField: "_id",
                as: "quotation_details.type_of_car",
              },
            },
            {
              $unwind: "$quotation_details.type_of_car",
            },

            {
              $lookup: {
                from: "sub_users",
                localField: "quotation_details.technicians",
                foreignField: "_id",
                as: "quotation_details.technicians",
              },
            },
            // {
            //   $unwind: "$quotation_details.technicians",
            //   // preserveNullAndEmptyArrays:true
            // },
            {
              $sort: sort,
            },
          ];
          // aggregationPipeline.push(
          //   {
          //     $match: condition,
          //   },
          //   {
          //     $lookup: {
          //       from: "clients",
          //       localField: "clientId",
          //       foreignField: "_id",
          //       as: "client_details",
          //     },
          //   },
          //   {
          //     $unwind: "$client_details",
          //   },
          //   {
          //     $match: matchStage,
          //   },
          //   {
          //     $lookup: {
          //       from: "quotes",
          //       localField: "quotation_id",
          //       foreignField: "_id",
          //       as: "quotation_details",
          //     },
          //   },
          //   {
          //     $unwind: "$quotation_details",
          //   },

          //   {
          //     $lookup: {
          //       from: "carlogos",
          //       localField: "quotation_details.type_of_car",
          //       foreignField: "_id",
          //       as: "quotation_details.type_of_car",
          //     },
          //   },
          //   {
          //     $unwind: "$quotation_details.type_of_car",
          //   },

          //   {
          //     $lookup: {
          //       from: "sub_users",
          //       localField: "quotation_details.technicians",
          //       foreignField: "_id",
          //       as: "quotation_details.technicians",
          //     },
          //   },
          //   // {
          //   //   $unwind: "$quotation_details.technicians",
          //   //   // preserveNullAndEmptyArrays:true
          //   // },
          //   {
          //     $sort: sort,
          //   },
          //   {
          //     $skip: data.offset ? +data.offset : 0,
          //   },
          //   {
          //     $limit: data.limit ? +data.limit : 10,
          //   }
          // );

          if (data.search) {
            const searchRegex = new RegExp(data.search, "i");
            aggregationPipeline.push({
              $match: {
                $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
              },
            });
          }
          items = await model.aggregate(arr);

          if (data.id) {
            resolve(items);
          } else {
            const page = data.offset ? parseInt(data.offset) : 1;
            const pageSize = data.limit ? parseInt(data.limit) : 10;

            const skip = (page - 1) * pageSize;
            const limitedItems = items.slice(skip, skip + pageSize);
            const totalItems = items.length;
            resolve({
              items: limitedItems,
              totalItems: totalItems,
            });
          }
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getInvoiceforfree(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data._id) {
          items = await getItemCustom(model, { _id: data.id }, "", "clientId");
          resolve(items);
        } else {
          const condition = { user_id: mongoose.Types.ObjectId(data.user_id) },
            aggregationPipeline = [],
            sort = data.sortBy === "old" ? { createdAt: 1 } : { createdAt: -1 };

          if (data.status === "all") {
          } else if (data.id) {
            condition._id = mongoose.Types.ObjectId(data.id);
          } else if (
            ["unpaid", "partially_paid", "fully_paid"].includes(data.status)
          )
            condition.status = data.status;
          aggregationPipeline.push(
            {
              $match: condition,
            },
            {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client_details",
              },
            },
            {
              $unwind: "$client_details",
            },

            {
              $lookup: {
                from: "quotes",
                localField: "quotation_id",
                foreignField: "_id",
                as: "quotation_details",
              },
            },
            {
              $unwind: "$quotation_details",
            },

            {
              $lookup: {
                from: "carlogos",
                localField: "quotation_details.type_of_car",
                foreignField: "_id",
                as: "quotation_details.type_of_car",
              },
            },
            {
              $unwind: "$quotation_details.type_of_car",
            },

            {
              $lookup: {
                from: "sub_users",
                localField: "quotation_details.technicians",
                foreignField: "_id",
                as: "quotation_details.technicians",
              },
            },
            // {
            //   $unwind: "$quotation_details.technicians",
            //   // preserveNullAndEmptyArrays:true
            // },
            {
              $sort: sort,
            },
            {
              $skip: data.offset ? +data.offset : 0,
            },
            {
              $limit: data.limit ? +data.limit : 10,
            }
          );

          if (data.search) {
            const searchRegex = new RegExp(data.search, "i");
            aggregationPipeline.push({
              $match: {
                $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
              },
            });
          }
          items = await model.aggregate(aggregationPipeline);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async invoice(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          const tempBalance = data?.total;
          data.balance = tempBalance;
          items = await createItem(model, data);
          await QuoteModel.findByIdAndUpdate(
            data.quotation_id,
            {
              $set: { InvoiceStatus: true, invoiceNumber: data?.invoiceNumber },
            },
            { new: true }
          );
          resolve(items);
        }
        if (data.type == "update") {
          const tempBalance = data?.total;
          data.balance = tempBalance;
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          items = await this.getInvoice(model, data);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async freeinvoice(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          items = await this.getInvoiceforfree(model, data);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async getClient(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.id) {
          items = await getItemThroughId(model, data.id);
          resolve(items);
        } else {
          const condition = { user_id: data.user_id },
            aggregationPipeline = [],
            sort = data.sortBy === "old" ? { createdAt: 1 } : { createdAt: -1 };
          if (["individual", "pro"].includes(data.clientType))
            condition.clientType = data.clientType;
          aggregationPipeline.push(
            // {
            //   $lookup: {
            //     from: "users",
            //     localField: "user_id",
            //     foreignField: "_id",
            //     as: "user_id",
            //   },
            // },
            // {
            //   $unwind: "$user_id",
            // },
            {
              $match: condition,
            },
            {
              $sort: sort,
            }
          );

          if (data.search) {
            const searchRegex = new RegExp(data.search, "i");
            aggregationPipeline.push({
              $match: {
                $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
              },
            });
          }
          items = await model.aggregate(aggregationPipeline);
          const page = data.offset ? parseInt(data.offset) : 1;
          const pageSize = data.limit ? parseInt(data.limit) : 10;

          const skip = (page - 1) * pageSize;
          const limitedItems = items.slice(skip, skip + pageSize);
          const totalItems = items.length;

          resolve(limitedItems, totalItems);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async createPaymentIntent(data, user, model) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!user.address) throw buildErrObject(422, "Address is required");
        var customer_id = null;

        if (!user.stripe_customer_id) {
          customer_id = user.stripe_customer_id;
        } else {
          const customer = await stripe.customers.create({
            address: {
              city: user.address.city.name,
              country: user.address.country.name,
              line1: user.address.complete_address,
              line2: user.address.complete_address,
              postal_code: user.address.pincode,
              state: user.address.state.name,
            },
            name: user.first_name + " " + user.last_name,
            description: "Acclem Customer",
          });

          user.stripe_customer_id = customer._id;
          await user.save();
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(data.amount) * 100),
          currency: "usd",
          customer: customer_id,
          automatic_payment_methods: {
            enabled: true,
          },
          description: "Acclem Customer",
        });

        if (data.proposal_id) {
          const update_payment_data = await model.updateOne(
            { _id: mongoose.Types.ObjectId(data.id) },
            {
              $set: {
                payment_Intent_id: paymentIntent.id,
                paymentIntent_Detail: paymentIntent,
                payment_type: paymentType,
              },
            }
          );

          const update_is_hire_status = await model.updateOne(
            { _id: mongoose.Types.ObjectId(data.id) },
            {
              $set: {
                is_hired: true,
              },
            }
          );
        }

        if (paymentIntent) {
          if (data.contract_id) {
            if (data.payment_type == "bonus") {
              const update_payment_data = await model.updateOne(
                { _id: mongoose.Types.ObjectId(data.id) },
                {
                  $set: {
                    bonus: {
                      payment_Intent_id: paymentIntent.id,
                      paymentIntent_Detail: paymentIntent,
                    },
                  },
                }
              );
            } else if (data.payment_type == "contract") {
              const update_payment_data = await model.updateOne(
                { _id: mongoose.Types.ObjectId(data.id) },
                {
                  $set: {
                    payment_Intent_id: paymentIntent.id,
                    paymentIntent_Detail: paymentIntent,
                  },
                }
              );
            }
          } else if (data.milestone_id) {
            // const get_milstone_detail = await model.findOne({_id: mongoose.Types.ObjectId(data.proposal_id)})
            // console.log("get_milstone_detail",get_milstone_detail);

            // get_milstone_detail.milestones.findOne({_id:mongoose.Types.ObjectId(data.milestone_id)}).paymentIntent_Detail = paymentIntent;
            // await get_milstone_detail.save();

            const update_intent = await model.updateOne(
              {
                _id: mongoose.Types.ObjectId(data.proposal_id),
                "milestones._id": mongoose.Types.ObjectId(data.milestone_id),
              },
              {
                $set: {
                  payment_Intent_id: paymentIntent.id,
                  paymentIntent_Detail: paymentIntent,
                },
              }
            );

            const update_is_hire_status = await model.updateOne(
              { _id: mongoose.Types.ObjectId(data.id) },
              {
                $set: {
                  is_hired: true,
                },
              }
            );
          }
          // console.log("update_payment_data", update_payment_data);
        }
        resolve(paymentIntent);
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    });
  },
  sendNotifications: sendNotifications,

  async getQuote(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.id) {
          items = await getItemCustom(
            model,
            { user_id: mongoose.Types.ObjectId(data._id) },
            "",
            "client_id"
          );
          resolve(items);
        } else {
          var condition = {};
          if (data.quote_id) {
            condition = {
              _id: mongoose.Types.ObjectId(data.quote_id),
            };
          } else if (data.client_id) {
            condition = {
              client_id: mongoose.Types.ObjectId(data.client_id),
              user_id: mongoose.Types.ObjectId(data.user_id),
              draft: data.draft ? data.draft : false,
              // InvoiceStatus: data.InvoiceStatus ? data.InvoiceStatus : false,
            };
          } else {
            condition = {
              user_id: mongoose.Types.ObjectId(data.user_id),
              draft: data.draft ? data.draft : false,
              InvoiceStatus: data.InvoiceStatus ? data.InvoiceStatus : false,
            };
          }

          if (data.minAmount !== undefined && data.maxAmount !== undefined) {
            // Add condition to filter by total amount range
            condition.total_amount = {
              $gte: data.minAmount,
              $lte: data.maxAmount,
            };
          }

          // else if (data.min !== undefined && data.typeforminAndmax == "min") {
          //   // Add condition to filter by minimum total amount
          //   condition.total_amount = {
          //     $gte: data.minAmount,
          //   };
          // } else if (data.max !== undefined && data.typeforminAndmax == "max") {
          //   // Add condition to filter by maximum total amount
          //   condition.total_amount = {
          //     $lte: data.maxAmount,
          //   };
          // }

          (aggregationPipeline = []),
            (sort =
              data.sortBy === "old" ? { createdAt: 1 } : { createdAt: -1 });
          if (data.status === "all") {
          } else if (
            ["unpaid", "partially_paid", "fully_paid"].includes(data.status)
          )
            condition.status = data.status;
          let matchStage = {};

          if (data.search) {
            matchStage.$or = [
              { "clientId.firstName": { $regex: data.search, $options: "i" } },
              { "clientId.lastName": { $regex: data.search, $options: "i" } }, // Search by client name
              { regNumber: { $regex: data.search, $options: "i" } }, // Search by registration number
            ];
          }

          if (data.start_date && data.end_date) {
            matchStage["createdAt"] = {
              $gte: new Date(data.start_date),
              $lte: new Date(data.end_date),
            };
          }
          console.log(condition);
          aggregationPipeline.push(
            {
              $match: condition,
            },

            {
              $lookup: {
                from: "clients",
                localField: "client_id",
                foreignField: "_id",
                as: "clientId",
              },
            },
            {
              $unwind: "$clientId",
            },
            {
              $match: matchStage,
            },
            {
              $lookup: {
                from: "carlogos",
                localField: "type_of_car",
                foreignField: "_id",
                as: "Cars",
              },
            },

            {
              $lookup: {
                from: "insuredpeople",
                localField: "insured_person",
                foreignField: "_id",
                as: "insured_person",
              },
            },

            // {
            //   $unwind: "$insured_person",
            //   // preserveNullAndEmptyArrays:true
            // },

            {
              $lookup: {
                from: "sub_users",
                localField: "expert",
                foreignField: "_id",
                as: "expert",
              },
            },
            {
              $lookup: {
                from: "sub_users",
                localField: "technicians",
                foreignField: "_id",
                as: "technition",
              },
            },

            {
              $lookup: {
                from: "insurences",
                localField: "insurance.company_id",
                foreignField: "_id",
                as: "insurences_details",
              },
            },
            {
              $addFields: {
                "insurences_details.tax": "$insurance.tax",
                "insurences_details.amount_offered":
                  "$insurance.amount_offered",
              },
            },
            // {
            //   $unset: ["insurance"], // Remove the original technician field
            // },
            // {
            //   $unwind: "$expert",
            //   preserveNullAndEmptyArrays:true
            // },

            {
              $sort: sort,
            }
          );

          /* if (data.search) {
            const searchRegex = new RegExp(data.search, "i");
            aggregationPipeline.push({
              $match: {
                $or: [
                  { firstName: searchRegex },
                  { lastName: searchRegex },
                ],
              },
            });
          } */
          items = await model.aggregate(aggregationPipeline);
          const page = data.offset ? parseInt(data.offset) : 1;
          const pageSize = data.limit ? parseInt(data.limit) : 10;

          const skip = (page - 1) * pageSize;
          const limitedItems = items.slice(skip, skip + pageSize);
          const totalItems = items.length;

          resolve({
            items: limitedItems,
            totalItems: totalItems,
          });
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async quote(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          if (data.quote_id) {
            items = await this.getQuote(model, data);
            resolve([items.items[0]]);
          } else {
            items = await this.getQuote(model, data);
            resolve(items);
          }
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getFreeQuotes(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        // console.log(user_id);
        let items;
        let condition = { draft: data.draft ? data.draft : false };
        let condition1 = {};
        let sort;
        if (data.sortBy == "asc") {
          sort = { createdAt: 1 };
        } else {
          /* else if (data.sortBy == 'client') {
          sort = { "clientId.createdAt":-1}
        } */
          sort = { createdAt: -1 };
        }
        // sort = data.sortBy === 'old' ? { createdAt: 1 } : { createdAt: -1 },
        aggregationPipeline = [];
        if (data.id) {
          // items = await getItemCustom(model, { _id: data.id }, "", "clientId");
          condition1._id = mongoose.Types.ObjectId(data.id);
          // resolve(items);
        }

        if (data.clientId) {
          condition["clientId._id"] = mongoose.Types.ObjectId(data.clientId);
        } else {
          condition = {
            garage_user_id: mongoose.Types.ObjectId(data.garage_user_id),
            draft: data.draft ? data.draft : false,
          };
        }

        if (data.minAmount !== undefined && data.maxAmount !== undefined) {
          // Add condition to filter by total amount range
          condition.total_amount = {
            $gte: data.minAmount,
            $lte: data.maxAmount,
          };
        } else if (data.min !== undefined && data.typeforminAndmax == "min") {
          // Add condition to filter by minimum total amount
          condition.total_amount = {
            $gte: data.minAmount,
          };
        } else if (data.max !== undefined && data.typeforminAndmax == "max") {
          // Add condition to filter by maximum total amount
          condition.total_amount = {
            $lte: data.maxAmount,
          };
        }

        if (data.search) {
          condition.$or = [
            { "clientId.firstName": { $regex: data.search, $options: "i" } },
            { "clientId.lastName": { $regex: data.search, $options: "i" } }, // Search by client name
            { regNumber: { $regex: data.search, $options: "i" } }, // Search by registration number
          ];
        }

        if (data.start_date && data.end_date) {
          condition["createdAt"] = {
            $gte: new Date(data.start_date),
            $lte: new Date(data.end_date),
          };
        }

        if (data.start_date && data.end_date) {
          condition["clientId.createdAt"] = {
            $gte: new Date(moment(data.start_date).clone().startOf("day")),
            $lte: new Date(moment(data.end_date).clone().endOf("day")),
          };
        }

        aggregationPipeline.push(
          {
            $match: condition1,
          },
          {
            $lookup: {
              from: "clients",
              localField: "clientId",
              foreignField: "_id",
              as: "clientId",
            },
          },
          {
            $unwind: "$clientId",
          },
          {
            $lookup: {
              from: "users",
              localField: "garage_user_id",
              foreignField: "_id",
              as: "garage_user_details",
            },
          },
          {
            $unwind: "$garage_user_details",
          },

          {
            $lookup: {
              from: "carlogos",
              localField: "car",
              foreignField: "_id",
              as: "Cars",
            },
          },

          {
            $lookup: {
              from: "sub_users", // Use the actual collection name here
              localField: "technician.techniciansId",
              foreignField: "_id",
              as: "technicianDetails",
            },
          },
          {
            $addFields: {
              "technicianDetails.totalHT": "$technician.totalHT",
              "technicianDetails.comment": "$technician.comment",
              "technicianDetails.discount": "$technician.discount",
            },
          },
          {
            $unset: ["technician"], // Remove the original technician field
          },
          {
            $match: condition,
          },
          {
            $sort: sort,
          }
        );

        /* if (data.search) {
          const searchRegex = new RegExp(data.search, "i");
          aggregationPipeline.push({
            $match: {
              $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
              ],
            },
          });
        } */
        items = await model.aggregate(aggregationPipeline);

        if (data.id) {
          resolve(items[0]);
        } else {
          const items = await model.aggregate(aggregationPipeline);
          const page = data.offset ? parseInt(data.offset) : 1;
          const pageSize = data.limit ? parseInt(data.limit) : 10;

          const skip = (page - 1) * pageSize; // Adjusted the calculation of skip
          const limitedItems = items.slice(skip, skip + pageSize);
          const totalItems = items.length;

          resolve({
            items: limitedItems,
            totalItems: totalItems,
          });
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async freeQuotes(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          items = await this.getFreeQuotes(model, data);
          // items.count = await model.aggregate(aggregationPipeline).length
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async getSubscription(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.id) {
          items = await getItemCustom(model, { _id: data.id });
          resolve(items);
        } else {
          const condition = {},
            aggregationPipeline = [],
            sort = data.sortBy === "old" ? { createdAt: 1 } : { createdAt: -1 };
          if (data.status === "all") {
          } else if (
            ["unpaid", "partially_paid", "fully_paid"].includes(data.status)
          )
            condition.status = data.status;
          aggregationPipeline.push(
            /* {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client_details",
              },
            },
            {
              $unwind: "$client_details",
            }, */
            {
              $match: condition,
            },
            {
              $sort: sort,
            },
            {
              $skip: data.offset ? +data.offset : 0,
            },
            {
              $limit: data.limit ? +data.limit : 10,
            }
          );

          /* if (data.search) {
            const searchRegex = new RegExp(data.search, "i");
            aggregationPipeline.push({
              $match: {
                $or: [
                  { firstName: searchRegex },
                  { lastName: searchRegex },
                ],
              },
            });
          } */
          items = await model.aggregate(aggregationPipeline);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async getCalendar(model, data) {
    return new Promise(async (resolve, reject) => {
      let response;
      try {
        if (data.id) {
          const response = model.findById(data.id).populate(data.path);
          // response = await getItemThroughIdNew(model, data.id , data.path );
          resolve(response);
        } else {
          let condition = { user_id: data.user_id };
          if (data.search) {
            condition.$or = [
              { model: { $regex: data.search, $options: "i" } },
              { licensePlate: { $regex: data.search, $options: "i" } },
              { status: { $regex: data.search, $options: "i" } },
              { vehicleStatus: { $regex: data.search, $options: "i" } },
            ];
          }
          response = await getItemsCustom(
            model,
            condition,
            "",
            "client_id",
            data.sortBy == "old" ? { createdAt: 1 } : { createdAt: -1 },
            data.limit ? data.limit : 10,
            data.offset ? data.offset : 0
          );
          resolve(response);
        }
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async calendar(model, data, locale) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          const user = await client.findOne({ _id: data.client_id });
          console.log(items);
          await emailer.sendPasswordToSubUser(
            locale,
            {
              to: user.email,
              subject: "Appointment for your vehicle",
              name: `${user.firstName} ${user.lastName}`,
              firstName: user.firstName,
              lastName: user.lastName,
              vehicleStatus: data.vehicleStatus,
              license: data.licensePlate,
              duration: data.duration,
              appname: process.env.APP_NAME,
              vehicleModel: data.model,
              logo: process.env.LOGO,
              date: data.date,
              time: data.time,
              link:
                process.env.Appointment_schedule_link +
                `/schedule/${items.data._id}`,
            },
            "appointmentSchedule"
          );
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          items = await this.getCalendar(model, data);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async getinsuredPerson(model, data) {
    return new Promise(async (resolve, reject) => {
      let response;
      try {
        if (data.id) {
          response = await getItemThroughId(model, data.id);
          resolve(response);
        } else {
          let condition = {
            garage_user_id: data.garage_user_id,
            client_id: data.clientId,
          };
          if (data.search) {
            condition.$or = [
              { first_name: { $regex: data.search, $options: "i" } },
              { email: { $regex: data.search, $options: "i" } },
              { garage_name: { $regex: data.search, $options: "i" } },
              // { vehicleStatus: { $regex: data.search, $options: "i" } },
            ];
          }
          response = await getItemsCustom(
            model,
            condition,
            "",
            "client_id",
            data.sortBy == "old" ? { createdAt: 1 } : { createdAt: -1 },
            data.limit ? data.limit : 10,
            data.offset ? data.offset : 0
          );
          resolve(response);
        }
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    });
  },
  async insuredPerson(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        if (data.type == "get") {
          items = await this.getinsuredPerson(model, data);
          resolve(items);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async servicesforgarage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.type == "create") {
          items = await createItem(model, data);
          resolve(items);
        }
        if (data.type == "update") {
          items = await updateItem(model, { _id: data.id }, data);
          resolve(items);
        }
        if (data.type == "destroy") {
          items = await deleteItem(model, { _id: data.id });
          resolve(items);
        }
        // if (data.type == "get") {
        //   items = await this.getinsuredPerson(model, data);
        //   resolve(items);
        // }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },
};
