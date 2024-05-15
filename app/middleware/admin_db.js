const {
  buildErrObject,
  itemNotFound
} = require("../middleware/utils");

const {
  getItemsCustom,
  countDocuments,
  getItemThroughId,
  getItemThroughIdWithPopulate,
  getItemCustom,
  aggregateCollection,
  createItem,
  updateItem,
  deleteItem
} = require('../shared/core')

var mongoose = require("mongoose");
const { resolve } = require("path");
const User = require("../models/user");
var bcrypt = require("bcrypt");
module.exports = {

  async getFaqTopics(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getFaqs(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.topic_id && data.topic_id != 'undefined') {
          condition.topic_id = mongoose.Types.ObjectId(data.topic_id)
        }
        if (data.search) {
          condition.type = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id question  answer type topic_id',
          'topic_id',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getUsers(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.role && data.role != 'undefined') {
          condition.role = data.role
        }
        if (data.search) {
          condition.$or = [
            { first_name: new RegExp(data.search, "i") },
            { last_name: new RegExp(data.search, "i") },
            { username: new RegExp(data.search, "i") },
            { email: new RegExp(data.search, "i") }

          ];
        }
        let item = await aggregateCollection(collection, [
          {
            $lookup: {
              from: 'professionalratings',
              let: {
                id: "$_id"
              },
              as: 'avgProfessionalratings',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$professional_id", "$$id"]
                    },
                  },

                },
                {
                  $group: {
                    _id: "_id",
                    avgRating: { $avg: "$rating" },
                    // countRating : {$sum:"$rating"} 
                  }
                },
              ],
            }
          },
          {
            $unwind: {
              path: '$avgProfessionalratings',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'professionalratings',
              let: {
                id: "$_id"
              },
              as: 'countTotalParson',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$professional_id", "$$id"]
                    },
                  },
                },
                {
                  $count: "countTotalParson"
                }

              ],
            }
          },
          {
            $unwind: {
              path: '$countTotalParson',
              preserveNullAndEmptyArrays: true
            }
          },

          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        )

        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },



  async getSkills(collections, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          "serviceCategory.serviceSubCategory._id": mongoose.Types.ObjectId(data.service_sub_category_id)
        }
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        let totalRecordsCondition = {
          service_sub_category_id: mongoose.Types.ObjectId(data.service_sub_category_id)
        }
        if (data.is_active == 'true') {
          totalRecordsCondition.is_active = true
          condition.serviceCategory.serviceSubCategory.skills.is_active = true
        }
        const item = await aggregateCollection(collections.Service, [
          {
            $lookup: {
              from: 'servicecategories',
              let: {
                serviceId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$service_id', '$$serviceId']
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'servicesubcategories',
                    let: {
                      serviceCategoryId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ['$service_category_id', '$$serviceCategoryId']
                          }
                        }
                      },
                      {
                        $lookup: {
                          from: 'skills',
                          let: {
                            serviceSubCategoryId: '$_id'
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ['$service_sub_category_id', '$$serviceSubCategoryId']
                                }
                              }
                            },
                            {
                              $skip: data.offset ? +data.offset : 0
                            },
                            {
                              $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                            }
                          ],
                          as: 'skills'
                        }
                      }
                    ],
                    as: 'serviceSubCategory'
                  }
                },
                {
                  $unwind: {
                    path: '$serviceSubCategory',
                    preserveNullAndEmptyArrays: false
                  }
                }
              ],
              as: "serviceCategory"
            }
          },
          {
            $unwind: {
              path: '$serviceCategory',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $match: condition
          },
          {
            $project: {
              name: 1,
              "serviceCategory._id": 1,
              "serviceCategory.name": 1,
              "serviceCategory.serviceSubCategory._id": 1,
              "serviceCategory.serviceSubCategory.name": 1,
              "serviceCategory.serviceSubCategory.skills._id": 1,
              "serviceCategory.serviceSubCategory.skills.name": 1,
              "serviceCategory.serviceSubCategory.skills.is_active": 1
            }
          }
        ]);
        item.data = item.data.length > 0 ? item.data[0] : []
        item.totalRecords = await countDocuments(collections.Skill, totalRecordsCondition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getHouseTypes(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getHouseTypeDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getHouseSubTypes(collections, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data.house_type_id)
        }
        let totalRecordsCondition = {
          house_type_id: mongoose.Types.ObjectId(data.house_type_id)
        }
        if (data.is_active == 'true') {
          totalRecordsCondition.is_active = true
          condition.houseSubTypes.is_active = true
        }
        let item = await aggregateCollection(collections.HouseType, [
          {
            $lookup: {
              from: 'housesubtypes',
              let: {
                houseId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$house_type_id', '$$houseId']
                    }
                  },
                },
                {
                  $skip: data.offset ? +data.offset : 0
                },
                {
                  $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                }
              ],
              as: "houseSubTypes"
            }
          },
          {
            $match: condition
          },
          {
            $project: {
              name: 1,
              "houseSubTypes._id": 1,
              "houseSubTypes.name": 1,
              "houseSubTypes.is_active": 1
            }
          }
        ])
        item.data = item.data.length > 0 ? item.data[0] : []
        item.totalRecords = await countDocuments(collections.HouseSubType, totalRecordsCondition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getHouseSubTypeDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProfessionalServices(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          // is_draft: false
        }
        if (data.search) {
          data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          condition.$or = [
            { "professionalDetails.username": new RegExp(data.search, 'i') },
            // {"professionalDetails.last_name" : new RegExp(data.search,'i')},
            { title: new RegExp(data.search, 'i') }
          ]
        }

        if (data.service_id) {
          condition.service_id = data.service_id
        }

        if (data.service_category_id) {
          condition.service_category_id = data.service_category_id
        }

        if (data.service_sub_category_id) {
          condition.service_sub_category_id = data.service_sub_category_id
        }

        if (data.country) {
          condition.country = data.country
        }

        const items = await aggregateCollection(collection, [

          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: "serviceDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'professional_id',
              foreignField: '_id',
              as: "professionalDetails"
            }
          },
          {
            $unwind: {
              path: '$professionalDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: "serviceCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceCategoryDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: "serviceSubCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceSubCategoryDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "countries",
              localField: 'country',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          //   {
          //    $lookup:{
          //      from:'bookingratings',

          //    let:{
          //      id:"$_id"
          //    },
          //    as:'bookingrating',
          //    pipeline:[
          //     {
          //       $match:{
          //         $expr:{
          //           $eq:["$professional_service_id","$$id"]
          //         },
          //       },

          //     },
          //     // {
          //     //   $group:{
          //     //     _id: "_id",
          //     //      avgRating: { $avg: "$rating" },
          //     //      countRating : {$sum:"$rating"} 
          //     //   }
          //     // },
          //     ],
          //   },
          // },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +data.offset : 0
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
          },
          // {
          //   $project: {
          //     _id: 1,
          //     professional_id: 1,
          //     title: 1,
          //     service_id: 1,
          //     service_category_id:1,
          //     service_sub_category_id:1,
          //     "serviceDetails.name": 1,
          //     "serviceCategoryDetails.name": 1,
          //     "serviceSubCategoryDetails.name": 1,
          //     "professionalDetails.first_name": 1,
          //     "professionalDetails.last_name": 1
          //   }
          // }
        ]);

        if (data.search) {
          items.totalRecords = items.data.length;


        } else {
          items.totalRecords = await countDocuments(collection, condition)
        }

        resolve(items)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProfessionalServiceDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {

        function getCustomLookUpForServicePlans(localField) {
          return {
            $lookup: {
              from: 'serviceplans',
              let: {
                plan_id: `$${localField}`,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$plan_id']
                    }
                  }
                }
              ],
              as: localField
            }
          }
        }

        function getMappedServices(field) {
          return {
            $map: {
              input: `$${field}`,
              as: "plans",
              in: "$$plans.name"
            }
          }
        }

        let servicePlanGroup = {
          title: 1,
          description: 1,
          price: 1,
          estimated_time: 1,
          estimated_time_unit: 1
        }

        let servicePlanProjection = {
          price_per: 1,
          basic: servicePlanGroup,
          premium: servicePlanGroup,
          platinum: servicePlanGroup,
          premium_enabled: 1,
          platinum_enabled: 1
        }

        const item = await aggregateCollection(collection, [
          {
            $match: {
              _id: mongoose.Types.ObjectId(data.professional_service_id)
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: "serviceDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: "serviceCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceCategoryDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'housesubtypes',
              localField: 'house_sub_type_id',
              foreignField: '_id',
              as: "houseSubTypes"
            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: "serviceSubCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceSubCategoryDetails',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'professional_id',
              foreignField: '_id',
              as: "professionalDetails"
            }
          },
          {
            $unwind: {
              path: '$professionalDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'product_id',
              foreignField: '_id',
              as: "products"
            }
          },
          {
            $unwind: {
              path: '$professionalDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          getCustomLookUpForServicePlans('single_plan.basic.included_services'),
          getCustomLookUpForServicePlans('single_plan.premium.included_services'),
          getCustomLookUpForServicePlans('single_plan.platinum.included_services'),
          getCustomLookUpForServicePlans('continues_plan.basic.included_services'),
          getCustomLookUpForServicePlans('continues_plan.premium.included_services'),
          getCustomLookUpForServicePlans('continues_plan.platinum.included_services'),
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
              compliance: 1,
              dynamic_steps: 1,
              terms_for_customers: 1,
              single_plan: servicePlanProjection,
              continues_plan: servicePlanProjection,
              serviceformsteps: 1,
              // products:1,
              "products._id": 1,
              "products.name": 1,
              "products.brand": 1,
              "products.description": 1,
              "products.images": 1,
              'single_plan.basic.included_services': getMappedServices('single_plan.basic.included_services'),
              'single_plan.premium.included_services': getMappedServices('single_plan.premium.included_services'),
              'single_plan.platinum.included_services': getMappedServices('single_plan.platinum.included_services'),
              'continues_plan.basic.included_services': getMappedServices('continues_plan.basic.included_services'),
              'continues_plan.premium.included_services': getMappedServices('continues_plan.premium.included_services'),
              'continues_plan.platinum.included_services': getMappedServices('continues_plan.platinum.included_services'),
              "serviceDetails.name": 1,
              "serviceCategoryDetails.name": 1,
              "serviceSubCategoryDetails.name": 1,
              "professionalDetails.profile_image": 1,
              "professionalDetails.first_name": 1,
              "professionalDetails.last_name": 1,
              "professionalDetails._id": 1,
              "houseSubTypes": {
                $map: {
                  input: "$houseSubTypes",
                  as: "houseSubTypes",
                  in: "$$houseSubTypes.name"
                }
              },
              image: {
                $arrayElemAt: ['$images', 0]
              },
            },
          }
        ])

        let response = {
          code: 200,
          data: item.data.length > 0 ? item.data[0] : null
        }

        resolve(response)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServiceFormHeadings(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {

        }

        if (data.country_id) {
          condition.country_id = data.country_id
        }

        const item = await getItemsCustom(collection,
          condition,
          '',
          '_id type createdAt description title updatedAt country_id',
          {},
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServiceFormQuestions(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          type: data.type,
        }

        if (data.country_id && data.service_id && data.service_category_id && data.service_sub_category_id) {
          condition.$and = [{
            country_id: data.country_id, service_id: data.service_id,
            service_category_id: data.service_category_id, service_sub_category_id: data.service_sub_category_id
          }]

        }

        const item = await getItemsCustom(collection,
          condition,
          '',
          '',
          {},
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getGeneralManagement(collection, type) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemCustom(collection,
          { type },
          'value'
        );
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getBookings(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          booking_completed: true
        }

        if (data.type == 'ongoing') {
          condition.status = {
            $in: ['pending', 'accepted', 'completed']
          }
        } else if (data.type == 'cancelled' || data.type == 'rejected') {
          condition.status = {
            $in: ['cancelled', 'rejected']
          }
        } else if (data.type) {
          condition.status = data.type

        } else if (data.search) {
          condition.$or = [{ order_id: new RegExp(data.search, "i") },
          { "clientDetails.first_name": new RegExp(data.search, "i") },
          { "service_details.title": new RegExp(data.search, "i") },
          { "professionalDetails.first_name": new RegExp(data.search, "i") }
          ];

        }

        const items = await aggregateCollection(collection, [
          {
            $lookup: {
              from: "services",
              localField: 'service_details.service_id',
              foreignField: '_id',
              as: 'mainServiceDetails'
            }
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: 'service_details.service_category_id',
              foreignField: '_id',
              as: 'serviceCategoryDetails'
            }
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: 'service_details.service_sub_category_id',
              foreignField: '_id',
              as: 'serviceSubCategoryDetails'
            }
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "professionalservices",
              localField: 'professional_service_id',
              foreignField: '_id',
              as: 'professionalServiceDetails'
            }
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "users",
              localField: 'user_id',
              foreignField: '_id',
              as: 'clientDetails'
            }
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "users",
              localField: 'professional_id',
              foreignField: '_id',
              as: 'professionalDetails'
            }
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +data.offset : 0
          },
          {
            $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $project: {
              total_amount_paid: 1,
              status: 1,
              plan_type: 1,
              order_id: 1,
              createdAt: 1,
              booking_date: 1,
              professional_service_id: 1,
              cancellation_reason: 1,
              "service_details.title": 1,
              image: {
                $arrayElemAt: ['$professionalServiceDetails.images', 0]
              },
              image_v2: {
                $arrayElemAt: ['$service_details.images', 0]
              },
              "mainServiceDetails.name": 1,
              "mainServiceDetails.name": 1,
              "serviceCategoryDetails.name": 1,
              "serviceSubCategoryDetails.name": 1,
              "professionalServiceDetails.title": 1,
              "clientDetails.first_name": 1,
              "clientDetails.email": 1,
              "professionalDetails.first_name": 1,
              "professionalDetails.email": 1
            }
          }
        ])
        if (data.search) {
          items.totalRecords = items.data.length;


        } else {
          items.totalRecords = await countDocuments(collection, condition)
        }

        resolve(items)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getBookingDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {

        let condition = {
          _id: mongoose.Types.ObjectId(data.booking_id)
        }

        const item = await aggregateCollection(collection, [
          {
            $match: condition
          },
          {
            $lookup: {
              from: "services",
              localField: 'service_details.service_id',
              foreignField: '_id',
              as: 'mainServiceDetails'
            }
          },
          {
            $unwind: {
              path: "$mainServiceDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: 'service_details.service_category_id',
              foreignField: '_id',
              as: 'serviceCategoryDetails'
            }
          },
          {
            $unwind: {
              path: "$serviceCategoryDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: 'service_details.service_sub_category_id',
              foreignField: '_id',
              as: 'serviceSubCategoryDetails'
            }
          },
          {
            $unwind: {
              path: "$serviceSubCategoryDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "professionalservices",
              localField: 'professional_service_id',
              foreignField: '_id',
              as: 'professionalServiceDetails'
            }
          },
          {
            $unwind: {
              path: "$professionalServiceDetails",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "users",
              localField: 'user_id',
              foreignField: '_id',
              as: 'clientDetails'
            }
          },
          {
            $unwind: {
              path: "$clientDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $lookup: {
              from: "users",
              localField: 'professional_id',
              foreignField: '_id',
              as: 'professionalDetails'
            }
          },
          {
            $unwind: {
              path: "$professionalDetails",
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $project: {
              total_amount_paid: 1,
              service_fees: 1,
              service_price: 1,
              status: 1,
              plan_type: 1,
              order_id: 1,
              createdAt: 1,
              booking_date: 1,
              image: {
                $arrayElemAt: ['$professionalServiceDetails.images', 0]
              },
              image_v2: {
                $arrayElemAt: ['$service_details.images', 0]
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
              "clientDetails.profile_image": 1,
              "clientDetails.first_name": 1,
              "clientDetails.email": 1,
              "clientDetails.phone_number": 1,
              "professionalDetails.profile_image": 1,
              "professionalDetails.first_name": 1,
              "professionalDetails.email": 1,
              "professionalDetails.phone_number": 1
            }
          }
        ])
        item.data = item.data.length > 0 ? item.data[0] : null
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getBlogs(collection, data) {
    return new Promise(async (resolve, reject) => {

      try {

        var condition = {
          "countryDetails.isoCode": data.info.country_code
        }
        if (data.country_id) {
          condition = {
            $and: [{ country_id: mongoose.Types.ObjectId(data.country_id) }, { title: new RegExp(data.search, 'i') }]
          }
        } else {
          condition = { $or: [{ title: new RegExp(data.search, 'i') }, { "serviceDetails.name": new RegExp(data.search, 'i') }] }
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: "countryDetails"
            }
          },
          {
            $unwind: {
              path: '$countryDetails',
              preserveNullAndEmptyArrays: true
            }
          }, {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: "serviceCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceCategoryDetails',
              preserveNullAndEmptyArrays: true
            }
          }, {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: "serviceDetails"
            }
          },
          {
            $unwind: {
              path: '$serviceDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: 'servicesubcategoriesDetails'
            }
          },
          {
            $unwind: {
              path: '$servicesubcategoriesDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +data.offset : 0
          },
          {
            $limit: data.limit ? +data.limit : 10
          },
        ]

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
          count: count.data.length ? count.data[0].createdAt : 0
        })

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },

  async getBlogDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServiceFormSteps(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        if (data.country_id) {
          condition.country_id = data.country_id
        }
        if (data.service_id) {
          condition.service_id = data.service_id
        }
        if (data.service_category_id) {
          condition.service_category_id = data.service_category_id
        }
        if (data.service_sub_category_id) {
          condition.service_sub_category_id = data.service_sub_category_id
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id title description country_id service_id service_category_id service_sub_category_id',
          'country_id service_id service_category_id service_sub_category_id',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message));
      }
    })
  },



  async getServiceFormStepDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },


  async getSubAdmins(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          role: 'subadmin'
        }
        const item = await getItemsCustom(collection,
          condition,
          '',
          [{
            path: "service_id",
          }, {
            path: "service_category_id",
          }, {
            path: "service_sub_category_id",
          }],
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getSubAdminDetails(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection,
          data,
          true
        );
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProductCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProductCategoryDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProductSubCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          product_category_id: mongoose.Types.ObjectId(data.product_category_id)
        }
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getProductSubCategoryDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getJobCategories(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getJobCategoryDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getJobSkills(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          job_category_id: mongoose.Types.ObjectId(data.job_category_id)
        }
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        const item = await getItemsCustom(collection,
          condition,
          '_id name is_active',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getJobSkillDetails(collection, _id) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughId(collection, _id, true);
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServicePlans(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          service_sub_category_id: mongoose.Types.ObjectId(data.service_sub_category_id)
        }

        if (data.is_active == 'true') {
          condition.is_active = true
        }

        const item = await getItemsCustom(collection,
          condition,
          '_id name description is_active'
        );

        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServiceFormTooltips(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {

        const item = await getItemsCustom(collection,
          {},
        );

        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getCountries(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {

        const item = await getItemsCustom(collection,
          {},
          'name isoCode'
        );

        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getServiceSubCategoriesPerCountry(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {

        const item = await aggregateCollection(collection, [
          {
            $lookup: {
              from: 'commissionanddiscounts',
              let: {
                serviceSubCategoryId: "$_id"
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$$serviceSubCategoryId', '$services.service_sub_category_id']
                    },
                    country_id: mongoose.Types.ObjectId(data.country_id)
                  }
                },
                {
                  $unwind: "$services"
                }
              ],
              as: 'values'
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              values: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$values",
                      as: "value",
                      cond: {
                        $eq: ["$value.services.service_sub_category_id", '$_id']
                      },
                    },
                  },
                  0
                ]
              },
            }
          }
        ])

        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async addJobCommission(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {

        const isExist = await model.findOne({
          country_id: data.country_id
        });

        if (isExist) {
          reject(buildErrObject(422, "This country already has a commission"));
        } else {
          await model.create({
            country_id: data.country_id,
            country_obj: data.country,
            fee_percent: data.percent,
            delivery_charges: data.delivery_charges,
            tax_charges: data.tax_charges

          })
          resolve(isExist)
        }
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async editJobCommission(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {

        const isExist = await model.findOne({
          country_id: data.country_id,
          _id: {
            $ne: data.commission_id
          }
        });

        if (isExist) {
          reject(buildErrObject(422, "This country already has a commission"));
        } else {
          await model.updateOne({
            _id: data.commission_id
          }, {
            $set: {
              country_id: data.country_id,
              country_obj: data.country,
              fee_percent: data.percent,
              delivery_charges: data.delivery_charges,
              tax_charges: data.tax_charges
            }
          })
          resolve(isExist)
        }


      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async deleteJobCommission(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {

        const flag = await model.deleteOne({
          _id: {
            $eq: data.commission_id
          }
        });

        resolve(flag)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async getJobCommission(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {

        const condition = {

        }
        if (data.search) {
          condition['country_obj.name'] = new RegExp(data.search, "i")
        }

        const list = await model.find(condition).skip(data.offset ? Number(data.offset) : 0).limit(data.limit ? Number(data.limit) : 10).sort({
          createdAt: -1
        });
        const count = await model.countDocuments(condition);

        resolve({
          list,
          count
        })

      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async addCareerJob(model, data) {
    return new Promise(async (resolve, reject) => {

      try {

        const added = await model.create({
          job_category_id: data.job_category_id,
          country_id: data.country_id,
          title: data.title,
          title_slug: data.title_slug,
          description: data.description,
        });

        resolve(added)

      } catch (err) {
        console.log(err)
        reject(buildErrObject(422, err.message));
      }

    })
  },

  async editCareerJob(model, data) {
    return new Promise(async (resolve, reject) => {

      try {

        /*    {
              job_category_id : data.job_category_id,
              country_id : data.country_id,
              title : data.title,
              title_slug : data.title_slug,
              description : data.description,
            }
    */
        const edited = await model.updateOne({
          _id: data.career_job_id
        }, {
          $set: data
        });

        resolve(edited)

      } catch (err) {
        console.log(err)
        reject(buildErrObject(422, err.message));
      }

    })
  },

  async deleteCareerJob(model, data) {
    return new Promise(async (resolve, reject) => {

      try {
        const deleted = await model.deleteOne({
          _id: data.career_job_id
        });

        resolve(deleted)

      } catch (err) {
        console.log(err)
        reject(buildErrObject(422, err.message));
      }

    })
  },

  async careerJobs(collection, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {
        let condition = {};
        if (data.country_id) {
          condition = {
            $and: [{ country_id: mongoose.Types.ObjectId(data.country_id) }, { title: new RegExp(data.search, "i") }]

          }
        }
        else {
          condition = { title: new RegExp(data.search, "i") }

        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: "countryDetails"
            }
          },
          {
            $unwind: {
              path: '$countryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'jobcategories',
              localField: 'job_category_id',
              foreignField: '_id',
              as: "jobCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$jobCategoryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +data.offset : 0
          },
          {
            $limit: data.limit ? +data.limit : 10
          },

        ]

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


        resolve({
          list: jobs.data,
          count: count.data.length ? count.data[0].createdAt : 0
        })


      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async careerJobDetails(collection, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {

      try {

        const condition = {
          _id: mongoose.Types.ObjectId(data.career_job_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: "countryDetails"
            }
          },
          {
            $unwind: {
              path: '$countryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'jobcategories',
              localField: 'job_category_id',
              foreignField: '_id',
              as: "jobCategoryDetails"
            }
          },
          {
            $unwind: {
              path: '$jobCategoryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $limit: 1
          },

        ]

        const job = await aggregateCollection(collection, agg);


        resolve(job.data.length ? job.data[0] : null)


      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async applicantsDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        if (data.params.career_job_id) {
          condition.$and = [{ career_job_id: mongoose.Types.ObjectId(data.params.career_job_id) }]
        }
        if (data.query.search) {
          condition.$or = [{ first_name: new RegExp(data.query.search, "i") }, { last_name: new RegExp(data.query.search, "i") }]

        }

        const forCount = await aggregateCollection(model, [{
          $match: condition
        }]);

        var agg = [
          {

            $match: condition

          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },
        ]
        const job = await aggregateCollection(model, agg);
        resolve({ list: job.data, count: forCount.data.length ?? 0 })
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async applicantsDetailsById(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await getItemThroughIdWithPopulate(model, data.applicant_id, true)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async postHomePageVideo(req, model) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await model.create(req.body)
        resolve({
          code: 200,
          data: item
        })
      } catch (err) {
        reject(buildErrObject(422, err.message))
      }
    })
  },

  async getRecommendedServices(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          country_id: mongoose.Types.ObjectId(data.country_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'professionalservices',
              localField: 'service_id',
              foreignField: '_id',
              as: 'professionalServiceDetails'
            }
          },
          {
            $unwind: {
              path: '$professionalServiceDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'countryDetails'
            }
          },
          {
            $unwind: {
              path: '$countryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
        ]
        const recommended = await aggregateCollection(model, agg)
        resolve({ list: recommended.data, count: recommended.data.length ?? 0 })

      } catch (err) {
        console.log(err)
        reject(buildErrObject(422, err.message))
      }

    })
  },

  async getPopularServices(model, data) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          country_id: mongoose.Types.ObjectId(data.country_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'professionalservices',
              localField: 'service_id',
              foreignField: '_id',
              as: 'popularDetails'
            }
          },
          {
            $unwind: {
              path: '$popularDetails',
              preserveNullAndEmptyArrays: true
            }

          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'countryDetails'
            }
          },
          {
            $unwind: {
              path: '$countryDetails',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1
            }
          },
        ]
        const popular = await aggregateCollection(model, agg);
        resolve({ list: popular.data, count: popular.data.length ?? 0 })
      } catch (err) {
        reject(buildErrObject(422, err.message))
      }
    })
  },


  async getContactRequests(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        // if(data.params.career_job_id){
        //   condition.$and=[{career_job_id:mongoose.Types.ObjectId(data.params.career_job_id)}]
        // }
        if (data.search) {
          condition.$or = [{ first_name: new RegExp(data.search, "i") }, { last_name: new RegExp(data.search, "i") }, { email: new RegExp(data.search, "i") }]

        }

        const forCount = await aggregateCollection(model, [{
          $match: condition
        }]);

        var agg = [
          {

            $match: condition

          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },
        ]
        const contactRequests = await aggregateCollection(model, agg);
        resolve({ list: contactRequests.data, count: forCount.data.length ?? 0 })
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getBuyer(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        // if(data.params.career_job_id){
        //   condition.$and=[{career_job_id:mongoose.Types.ObjectId(data.params.career_job_id)}]
        // }
        if (data.search) {
          condition.$or = [{ first_name: new RegExp(data.search, "i") }, { last_name: new RegExp(data.search, "i") }, { email: new RegExp(data.search, "i") }]

        }

        var agg = [
          {
            $lookup: {
              from: "faqs",
              localField: "type",
              foreignField: "type",
              as: "FaqDetails"
            }
          },
          {

            $match: condition

          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]
        const item = await aggregateCollection(model, agg);
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getSeller(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        // if(data.params.career_job_id){
        //   condition.$and=[{career_job_id:mongoose.Types.ObjectId(data.params.career_job_id)}]
        // }
        if (data.search) {
          condition.$or = [{ first_name: new RegExp(data.search, "i") }, { last_name: new RegExp(data.search, "i") }, { email: new RegExp(data.search, "i") }]

        }

        var agg = [
          {
            $lookup: {
              from: "faqs",
              localField: "type",
              foreignField: "type",
              as: "FaqDetails"
            }
          },
          {

            $match: condition

          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]
        const item = await aggregateCollection(model, agg);
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async airlinesList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {};
        // if(data.params.career_job_id){
        //   condition.$and=[{career_job_id:mongoose.Types.ObjectId(data.params.career_job_id)}]
        // }
        if (data.country_id) {
          condition.country_id = mongoose.Types.ObjectId(data.country_id);
        }
        if (data.search) {
          condition.name = new RegExp(data.search, 'i');
        }

        var agg = [
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "service_details"
            }
          },
          {
            $unwind: {
              path: "$service_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_category_id",
              foreignField: "_id",
              as: "service_category_details"
            }
          },
          {
            $unwind: {
              path: "$service_category_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "country_details"
            }
          },
          {
            $unwind: {
              path: "$country_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: 'service_sub_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_sub_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },

        ]
        const item = await aggregateCollection(model, agg);
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async airlineDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data.airline_id)
        };
        // if(data.params.career_job_id){
        //   condition.$and=[{career_job_id:mongoose.Types.ObjectId(data.params.career_job_id)}]
        // }
        if (data.search) {
          condition.$or = [{ first_name: new RegExp(data.search, "i") }, { last_name: new RegExp(data.search, "i") }, { email: new RegExp(data.search, "i") }]

        }

        var agg = [
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "service_details"
            }
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "service_category_id",
              foreignField: "_id",
              as: "service_category_details"
            }
          },
          {
            $lookup: {
              from: "countries",
              localField: "country_id",
              foreignField: "_id",
              as: "country_details"
            }
          },
          {
            $unwind: {
              path: "$service_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: "$service_category_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: "$country_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              form: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? Number(data.offset) : 0,

          },
          {
            $limit: data.limit ? Number(data.limit) : 10,
          },

        ]
        const item = await aggregateCollection(model, agg);
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMediaList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.country_id) {
          condition.country_id = mongoose.Types.ObjectId(data.country_id);
        }
        if (data.search) {
          condition.name = new RegExp(data.search, 'i');
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            },
          },
          {
            $unwind: {
              path: "$country_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },

        ]
        const item = await aggregateCollection(model, agg);
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMediaDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.media_categories_id)
        }
        const agg = [
          {
            $lookup: {
              from: "services",
              localField: 'service_id',
              foreignField: "_id",
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getServiceMeasurementDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.service_units_measurements_id)
        };
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: "service_details"
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'

            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },

          {

            $skip: data.offset ? Number(data.offset) : 0,

          },
          {

            $limit: data.limit ? Number(data.limit) : 10,

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }

    })
  },


  async getServiceMeasurementsList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition,
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? Number(data.offset) : 0,
          },
          {
            $limit: data.limit ? Number(data.limit) : 10,
          },

        ]
        // const item = await aggregateCollection(model,agg)
        const item = await model.aggregate(agg)
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAdtypesList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition,

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          },
        ]
        const item = await aggregateCollection(model, agg)
        resolve({ data: item.data, count: forCount.data.length ?? 0 })
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAdTypes(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.ad_types_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {

            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }

          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          },
        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getPlacementList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [

          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfPlacement(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.ad_placement_id)
        };
        var agg = [
          {

            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }

          },
          {

            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }

          },
          {

            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }

          },
          {

            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAdvertisement(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.advertisement_format_id)
        };
        var agg = [
          {

            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }

          },
          {

            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }

          },
          {

            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }

          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAdvertisementList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        };
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfPurposeOfAdvertisement(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.purpose_of_advertisement_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getPurposeOfAdvertisementList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? Number(data.offset) : 0

          },
          {

            $limit: data.limit ? Number(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getQuestionList(model) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await model.find()
        resolve({
          code: 200,
          data: item
        })
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAirPostLIST(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getDetailsOfAirPortsList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.airports_list_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async SelectedCinemaList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfSelectedCinema(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.select_cinema_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getCinemaChainBrandList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfCinemaChainBrand(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.cinema_chain_brand_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getScreenCategoryList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfScreenCategory(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.screen_category_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getScreenTypeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        };
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfScreenType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.type_of_screen_id)
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMallNameList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])


        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10


          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfMallName(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.mall_name_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMovieTypeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10


          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfmovieType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.movie_type_id)
        }

        var agg = [
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAdvertisementTypeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10


          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAdvertisementType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.advertisement_type_id)
        }

        var agg = [
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAdvertisementLanguageList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10


          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAdvertisementLanguage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.advertisement_language_id)
        }

        var agg = [
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAudienceList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAudienceType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.audience_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getReaderShipCategoryList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}

        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        };
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfReaderShipCategory(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.readership_category_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getBidTypeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfBidType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.bid_type_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMagazineList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfMagazine(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          // _id:mongoose.Types.ObjectId(data.magazine_id)
        }

        if (data.magazine_id) {
          condition._id = mongoose.Types.ObjectId(data.magazine_id)
        }

        if (data.magazine_media_id) {
          condition._id = mongoose.Types.ObjectId(data.magazine_media_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getNewsPaperList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])


        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfNewsPaper(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.newspaper_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getRadioList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfRadio(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.radio_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getTelevisionList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfTelevision(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.television_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          },

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getOutOfHomeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfOutOfHome(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.out_of_home_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getDigitalMediaList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getDigitalDigitalMedia(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.digital_media_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: "country_id",
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {

            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {

            $skip: data.offset ? +(data.offset) : 0

          },
          {

            $limit: data.limit ? +(data.limit) : 10

          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getAudienceTypeList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
     
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfAudienceType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMagazineFrequencyList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })

  },


  async getDetailsOfMagazineFrequency(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.magazine_frequency_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMagazineCirculationList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        console.log('************', condition, forCount)
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfMagazineCirculation(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.magazine_circulation_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getDetailsOfMagazineCategory(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.magazine_category_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMagazineSubCategoryList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        console.log('************', condition, forCount)
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'magazinecategories',
              localField: 'magazine_category_id',
              foreignField: '_id',
              as: 'magazine_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfMagazineSubCategory(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.magazine_sub_category_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'magazinecategories',
              localField: 'magazine_category_id',
              foreignField: '_id',
              as: 'magazine_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getMagazineLanguageList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        console.log('************', condition, forCount)
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition

          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },

        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfMagazineLanguage(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.magazine_language_id)
        };

        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },


          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }

        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getServiceBookingDetails(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await model.find({})
        item.count = await countDocuments(model)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getProfessionalServiceList(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        // const item = await model.find()
        const condition = {};
        //   if (data.role && data.role != 'undefined') {
        //   condition.role = data.role
        // // }
        // if (data.search) {
        //   condition.$or = [
        //     { first_name: new RegExp(data.search, "i") },
        //     { last_name: new RegExp(data.search, "i") },
        //     { username: new RegExp(data.search, "i") },
        //     { email: new RegExp(data.search, "i") }

        //   ];
        // }

        const item = await aggregateCollection(collection, [
          {
            $lookup: {
              from: 'bookingratings',

              let: {
                id: "$_id"
              },
              as: 'bookingrating',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$professional_service_id", "$$id"]
                    },
                  },

                },
                {
                  $group: {
                    _id: "_id",
                    avgRating: { $avg: "$rating" },
                    // countRating : {$sum:"$rating"} 
                  }
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$bookingrating',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'bookingratings',
              let: {
                id: "$_id"
              },
              as: 'countParson',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$professional_service_id", "$$id"]
                    },
                  },

                },
                {
                  $count: "countParson"
                }

              ],

            }
          },
          {
            $unwind: {
              path: '$countParson',
              preserveNullAndEmptyArrays: true
            }
          },

          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 200
          }

        ]
        )

        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getPopularLocation(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          conditionc.name = new RegExp(data.search, 'i')
        }

        const item = await getItemsCustom(model, condition,
          '',
          '',
          { createdAt: -1 },
          +data.limit,
          +data.offset
        );
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message))
      }
    })
  },



  async getAdminNotification(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          admin_id: data.admin_id,
        };
        if (data.role && data.role != 'undefined') {
          condition.role = data.role
        }

        if (data.is_seen == "false") {
          condition.is_seen = false
        }


        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        }
        const item = await getItemsCustom(model, condition,
          "",
          "",
          { createdAt: -1 },
          +data.limit,
          +data.offset,
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getProfessionalRatingList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          professional_id: mongoose.Types.ObjectId(data.professional_id)
        }
        if (data.search) {
          condition.$or = [{ 'user_details.first_name': new RegExp(data.search, 'i') },
          { 'user_details.last_name': new RegExp(data.search, 'i') },
          { 'user_details.description': new RegExp(data.search, 'i') },
          { review: new RegExp(data.search, 'i') }]
        }
        if (data.filter) {
          condition.rating = +data.filter
        }
        console.log("***********condition", condition)
        var agg = [
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user_details'
            }
          },
          {
            $unwind: {
              path: '$user_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $addFields: {
              mostLiked: {
                $size: {
                  $filter: {
                    input: "$like_dislikes",
                    as: "like",
                    cond: {
                      $eq: ["$$like.status", "like"]
                    },
                  }
                }
              },
            },
          },
          {
            $addFields: {
              mostDisLiked: {
                $size: {
                  $filter: {
                    input: "$like_dislikes",
                    as: "dislike",
                    cond: {
                      $eq: ["$$dislike.status", "dislike"]
                    },
                  }
                }
              },
            },
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)

      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getbookingRatingsList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          professional_service_id: mongoose.Types.ObjectId(data.professional_service_id)
        }
        if (data.filter) {
          condition.rating = +data.filter
        }


        if (data.search) {
          condition.$or = [{ 'user_details.first_name': new RegExp(data.search, 'i') },
          { 'user_details.last_name': new RegExp(data.search, 'i') },
          { 'user_details.description': new RegExp(data.search, 'i') },
          { review: new RegExp(data.search, 'i') },
          ]
        }
        var agg = [
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user_details'
            }
          },
          {
            $unwind: {
              path: '$user_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]

        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getEventList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}


        if (data.search) {
          condition.$or = [{ name: new RegExp(data.search, 'i') }, { 'country_details.name': new RegExp(data.search, 'i') }]
        }

        const forCount = await aggregateCollection(model, [{ $match: condition }])
        console.log('************', condition, forCount)

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: "_id",
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getDetailsOfEvent(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.event_id)
        }

        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)

      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },




  async getProjectSpeciality(collections, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          "serviceCategory.serviceSubCategory._id": mongoose.Types.ObjectId(data.service_sub_category_id)
        }
        if (data.is_active == 'true') {
          condition.is_active = true
        }
        let totalRecordsCondition = {
          service_sub_category_id: mongoose.Types.ObjectId(data.service_sub_category_id)
        }
        if (data.is_active == 'true') {
          totalRecordsCondition.is_active = true
          condition.serviceCategory.serviceSubCategory.skills.is_active = true
        }
        const item = await aggregateCollection(collections.Service, [
          {
            $lookup: {
              from: 'servicecategories',
              let: {
                serviceId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$service_id', '$$serviceId']
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'servicesubcategories',
                    let: {
                      serviceCategoryId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ['$service_category_id', '$$serviceCategoryId']
                          }
                        }
                      },
                      {
                        $lookup: {
                          from: 'projectspecialities',
                          let: {
                            serviceSubCategoryId: '$_id'
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ['$service_sub_category_id', '$$serviceSubCategoryId']
                                }
                              }
                            },
                            {
                              $skip: data.offset ? +data.offset : 0
                            },
                            {
                              $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                            }
                          ],
                          as: 'ProjectSpeciality'
                        }
                      }
                    ],
                    as: 'serviceSubCategory'
                  }
                },
                {
                  $unwind: {
                    path: '$serviceSubCategory',
                    preserveNullAndEmptyArrays: false
                  }
                }
              ],
              as: "serviceCategory"
            }
          },
          {
            $unwind: {
              path: '$serviceCategory',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $match: condition
          },
          {
            $project: {
              name: 1,
              "serviceCategory._id": 1,
              "serviceCategory.name": 1,
              "serviceCategory.serviceSubCategory._id": 1,
              "serviceCategory.serviceSubCategory.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.title": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.status": 1
            }
          }
        ]);
        item.data = item.data.length > 0 ? item.data[0] : []
        // item.totalRecords = await countDocuments(collections.projectspecialities, totalRecordsCondition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getViewingGigStatistisc(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}

        if (data.search) {
          condition.type = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(model,
          condition,
          '',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async getSellerPopularTopic(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}

        if (data.search) {
          condition.type = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(model,
          condition,
          '',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async getBuyerPopularTopics(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}

        if (data.search) {
          condition.type = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(model,
          condition,
          '',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async getSelllerWithdrawlRevenues(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {}

        if (data.search) {
          condition.type = new RegExp(data.search, "i");
        }
        const item = await getItemsCustom(model,
          condition,
          '',
          '',
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }

    })
  },

  async getBuyerOrderManagement(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        if (data.search) {
          condition.type = new RegExp(data.search, 'i');
        }
        const item = await getItemsCustom(model, condition,
          "",
          "",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async getBuyerPayment(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {

        }
        if (data.search) {
          condition.type = new RegExp(data.search, 'i')
        }
        const item = await getItemsCustom(model, condition,
          "",
          "",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getIndustry(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          "serviceCategory.serviceSubCategory.ProjectSpeciality._id": mongoose.Types.ObjectId(data.project_speciality_id)
        }

        if (data.is_active == 'true') {
          condition.is_active = true
        }

        const totalRecordsCondition = {
          project_speciality_id: mongoose.Types.ObjectId(data.project_speciality_id)
        }

        if (data.is_active == 'true') {
          totalRecordsCondition = true
        }

        const item = await aggregateCollection(model.Service, [
          {
            $lookup: {
              from: 'servicecategories',
              let: {
                serviceId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$service_id', '$$serviceId']
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'servicesubcategories',
                    let: {
                      serviceCategoryId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ['$service_category_id', '$$serviceCategoryId']
                          }
                        }
                      },
                      {
                        $lookup: {
                          from: 'projectspecialities',
                          let: {
                            serviceSubCategoryId: '$_id'
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ['$service_sub_category_id', '$$serviceSubCategoryId']
                                }
                              }
                            },
                            {
                              $lookup: {
                                from: 'industries',
                                let: {
                                  projectspecialitiesId: '$_id'
                                },
                                pipeline: [
                                  {
                                    $match: {
                                      $expr: {
                                        $eq: ['$project_speciality_id', '$$projectspecialitiesId']
                                      }
                                    }
                                  },
                                  {
                                    $skip: data.offset ? +data.offset : 0
                                  },
                                  {
                                    $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                                  }

                                ],
                                as: 'IndustryDetails'
                              }
                            }
                          ],
                          as: 'ProjectSpeciality'
                        }
                      },
                      {
                        $unwind: {
                          path: '$ProjectSpeciality',
                          preserveNullAndEmptyArrays: false
                        }
                      }
                    ],
                    as: 'serviceSubCategory'
                  }
                },
                {
                  $unwind: {
                    path: '$serviceSubCategory',
                    preserveNullAndEmptyArrays: false
                  }
                }

              ],
              as: 'serviceCategory'
            }
          },
          {
            $unwind: {
              path: '$serviceCategory',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $match: condition
          },
          {
            $project: {
              name: 1,
              "serviceCategory._id": 1,
              "serviceCategory.name": 1,
              "serviceCategory.serviceSubCategory._id": 1,
              "serviceCategory.serviceSubCategory.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.title": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.status": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.status": 1
            }
          }
        ])
        console.log(item)
        item.data = item.data.length ? item.data[0] : null
        // item.totalRecords = await countDocuments(collections.projectspecialities, totalRecordsCondition)
        resolve(item)


      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getIndustryAtribute(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails._id": mongoose.Types.ObjectId(data.industry_id)
        }

        if (data.is_active == 'true') {
          condition.is_active = true
        }

        const totalRecordsCondition = {
          industry_id: mongoose.Types.ObjectId(data.industry_id)
        }

        if (data.is_active == 'true') {
          totalRecordsCondition = true
        }

        const item = await aggregateCollection(model.Service, [
          {
            $lookup: {
              from: 'servicecategories',
              let: {
                serviceId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$service_id', '$$serviceId']
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'servicesubcategories',
                    let: {
                      serviceCategoryId: '$_id'
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $eq: ['$service_category_id', '$$serviceCategoryId']
                          }
                        }
                      },
                      {
                        $lookup: {
                          from: 'projectspecialities',
                          let: {
                            serviceSubCategoryId: '$_id'
                          },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $eq: ['$service_sub_category_id', '$$serviceSubCategoryId']
                                }
                              }
                            },
                            {
                              $lookup: {
                                from: 'industries',
                                let: {
                                  projectspecialitiesId: '$_id'
                                },
                                pipeline: [
                                  {
                                    $match: {
                                      $expr: {
                                        $eq: ['$project_speciality_id', '$$projectspecialitiesId']
                                      }
                                    }
                                  },
                                  {
                                    $lookup: {
                                      from: 'industryatributes',
                                      let: {
                                        industryId: '$_id'
                                      },
                                      pipeline: [
                                        {
                                          $match: {
                                            $expr: {
                                              $eq: ['$industry_id', '$$industryId']
                                            }
                                          }
                                        },
                                        {
                                          $skip: data.offset ? +(data.offset) : 0
                                        },
                                        {
                                          $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                                        }
                                      ],
                                      as: 'IndustryAtributeDetails'
                                    }
                                  }
                                ],
                                as: 'IndustryDetails'
                              }
                            },
                            {
                              $unwind: {
                                path: '$IndustryDetails',
                                preserveNullAndEmptyArrays: false
                              }
                            }
                          ],
                          as: 'ProjectSpeciality'
                        }
                      },
                      {
                        $unwind: {
                          path: '$ProjectSpeciality',
                          preserveNullAndEmptyArrays: false
                        }
                      }
                    ],
                    as: 'serviceSubCategory'
                  }
                },
                {
                  $unwind: {
                    path: '$serviceSubCategory',
                    preserveNullAndEmptyArrays: false
                  }
                }
              ],
              as: 'serviceCategory'
            }
          },
          {
            $unwind: {
              path: '$serviceCategory',
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $match: condition
          },
          {
            $project: {
              name: 1,
              "serviceCategory._id": 1,
              "serviceCategory.name": 1,
              "serviceCategory.serviceSubCategory._id": 1,
              "serviceCategory.serviceSubCategory.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.title": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.status": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.status": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.IndustryAtributeDetails._id": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.IndustryAtributeDetails.name": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.IndustryAtributeDetails.attribute_type": 1,
              "serviceCategory.serviceSubCategory.ProjectSpeciality.IndustryDetails.IndustryAtributeDetails.status": 1
            }
          }
        ]
        )
        console.log("*******item", item)
        item.data = item.data.length > 0 ? item.data[0] : null
        // item.totalRecords = await countDocuments(collections.projectspecialities, totalRecordsCondition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getBillingInfo(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          // data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          condition.$or = [
            { "user_details.username": new RegExp(data.search, 'i') },
            // {"": new RegExp(data.search,'i')},
            { "service_booking_details.order_id": new RegExp(data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          ]
        }


        var agg = [
          {
            $lookup: {
              from: 'products',
              localField: ' product_id',
              foreignField: '_id',
              as: 'product_details'
            }
          },
          {
            $unwind: {
              path: '$product_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'payments',
              localField: 'payment_id',
              foreignField: '_id',
              as: 'payment_details'
            }
          },
          {
            $unwind: {
              path: '$payment_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user_details'
            }
          },
          {
            $unwind: {
              path: '$user_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'quotes',
              localField: 'quote_id',
              foreignField: "_id",
              as: 'quotes_details'
            }
          },
          {
            $unwind: {
              path: '$quotes_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicebookings',
              localField: 'booking_id',
              foreignField: '_id',
              as: 'service_booking_details'
            }
          },
          {
            $unwind: {
              path: '$service_booking_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : Number.MAX_SAFE_INTEGER
          }
        ]

        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getTravellingList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}

        if (data.search) {
          condition.name = new RegExp(data.search, 'i')
        }


        if (data.filter) {
          condition.type = data.filter
        }
        console.log("******condition", condition)
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }

          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]

        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfTravelling(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data.travelling_id)
        }
        console.log("*************condition", condition)
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }

          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        console.log(condition)
        const item = await aggregateCollection(model, agg)
        console.log("********item****", item)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDashBoard(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}
        condition.role = "Professional"
        condition.status = "active"

        const totalActiveRecords = await countDocuments(model.User, condition)

        const obj = {}
        obj.role = 'Professional'
        const totalProfessional = await countDocuments(model.User, obj)

        const obj1 = {}
        obj1.status = "in_progress"
        const ongoingServices = await countDocuments(model.ServiceBooking, obj1)

        const obj2 = {}
        obj2.status = 'completed'
        const completedServices = await countDocuments(model.ServiceBooking, obj2)

        const totalPostServices = await countDocuments(model.ServiceBooking)

        resolve({
          totalActiveRecords: totalActiveRecords,
          totalProfessional: totalProfessional,
          ongoingServices: ongoingServices,
          completedServices: completedServices,
          totalPostServices: totalPostServices
        })
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getTexType(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        if (data.country_id) {
          condition.country_id = data.country_id
        }
        console.log("*****", condition)
        const item = await getItemsCustom(model, condition,
          "",
          "country_id",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getProjectList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {}
        if (data.search) {
          condition.$or = [
            {
              project_name: new RegExp(data.search, "i"),
            },
            {
              "service_id.name": new RegExp(data.search, "i"),
            },
            {
              "service_category_id.name": new RegExp(data.search, "i"),

            },
            {
              "service_sub_category_id.name": new RegExp(data.search, "i"),
            },
            // {
            //   "finalize.no_of_project": new RegExp(data.search, "i")
            // },
            {
              project_benifit: new RegExp(data.search, "i")
            }
          ]
          // condition.project_name = new RegExp(data.search,"i");
        }

        console.log("Checking the search value ", [`project_category.service_id.name`]);
        // const item = await getItemsCustom(model,condition,
        //   "",
        //   "project_category.service_id project_category.service_category_id project_category.service_sub_category_id",
        //   {createdAt:-1},
        //   data.limit,
        //   data.offset
        //   );

        const item = await model.aggregate([
          {
            $lookup: {
              from: "services",
              localField: "project_category.service_id",
              foreignField: "_id",
              as: "service_id",
            },
          },
          {
            $lookup: {
              from: "servicecategories",
              localField: "project_category.service_category_id",
              foreignField: "_id",
              as: "service_category_id",
            },
          },
          {
            $lookup: {
              from: "servicesubcategories",
              localField: "project_category.service_sub_category_id",
              foreignField: "_id",
              as: "service_sub_category_id",
            },
          },
          {
            $unwind: {
              path: "$service_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$service_category_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: "$service_sub_category_id",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: condition
          }
        ])
        console.log("Condition ", condition);
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getWithdrawlList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        const item = await getItemsCustom(model, condition,
          "",
          "user_id",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfBillingInfo(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data)
        };

        console.log("******data", condition)
        var agg = [
          {
            $lookup: {
              from: 'products',
              localField: ' product_id',
              foreignField: '_id',
              as: 'product_details'
            }
          },
          {
            $unwind: {
              path: '$product_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'payments',
              localField: 'payment_id',
              foreignField: '_id',
              as: 'payment_details'
            }
          },
          {
            $unwind: {
              path: '$payment_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user_details'
            }
          },
          {
            $unwind: {
              path: '$user_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'quotes',
              localField: 'quote_id',
              foreignField: "_id",
              as: 'quotes_details'
            }
          },
          {
            $unwind: {
              path: '$quotes_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicebookings',
              localField: 'booking_id',
              foreignField: '_id',
              as: 'service_booking_details'
            }
          },
          {
            $unwind: {
              path: '$service_booking_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : Number.MAX_SAFE_INTEGER
          }
        ]
        const item = await aggregateCollection(model, agg)
        console.log(item)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfProject(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let condition = {
          _id: mongoose.Types.ObjectId(data)
        }

        const item = await getItemCustom(collection,
          condition,
          '',
          'project_category.service_id project_category.service_category_id project_category.service_sub_category_id',
          { createdAt: -1 },
          data.limit,
          data.offset
        );

        resolve(item)
      } catch (error) {
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async paymentByAcclemWallet(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          booking_completed: true,
          status: 'completed',
          total_amount_paid: { $ne: { $or: [null, 0] } },
          IsWithdraw: false,
        }

        if (status == "completed") {

        }
        var result;
        const items = await model.aggregateCollection(
          [{
            $lookup: {
              from: 'resolutioncenters',
              localField: '_id',
              foreignField: 'booking_id',
              as: 'resolution_details'
            }
          },
          {
            $unwind: {
              path: "$resolution_details",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'professional_id',
              foreignField: '_id',
              as: 'professional_details'
            }
          },
          {
            $unwind: {
              path: '$professional_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'WithdrawalAccountDetail',
              localField: 'professional_id',
              foreignField: 'user_id',
              as: 'account_detail'
            }
          },
          {
            $unwind: {
              path: '$account_detail',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: condition
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
          ])
        item.count = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getWithdrawlAccountList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};

        if (data.search) {
          condition.$or = [
            { "booking_id.order_id": new RegExp(data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") },
            { "user_detail.username": new RegExp(data.search, "i") },
            { "professional_detail.username": new RegExp(data.search, "i") },

          ];
          //  data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          //  condition["booking_id.order_id"] = new RegExp(data.search,'i')
        }
        var agg = [
          {
            $lookup: {
              from: 'servicebookings',
              localField: 'booking_id',
              foreignField: '_id',
              as: 'booking_id'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'booking_id.user_id',
              foreignField: '_id',
              as: 'user_detail'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'booking_id.professional_id',
              foreignField: '_id',
              as: 'professional_detail'
            }
          },
          {
            $unwind: {
              path: '$professional_detail',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: '$user_detail',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $unwind: {
              path: '$booking_id',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        const item = await aggregateCollection(model, agg)
        item.count = await countDocuments(model, agg)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsWithdrawal(collection, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data)
        }
        // var item = await collection.findOne(condition)
        // .populate("booking_id")
        // .populate({
        //    path : 'booking_id',
        //     populate : {
        //     path : 'professional_service_id professional_id user_id'
        //     }
        //   })
        const item = await aggregateCollection(collection, [
          {
            $lookup: {
              from: "servicebookings",
              let: {
                bookingId: '$booking_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$_id", "$$bookingId"]
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'professionals',
                    localField: 'professional_id',
                    foreignField: '_id',
                    as: 'professional_id'
                  }
                },
                {
                  $unwind: {
                    path: '$professional_id',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $lookup: {
                    from: 'professionalservices',
                    localField: 'professional_service_id',
                    foreignField: '_id',
                    as: 'professional_service_id'
                  }
                },
                {
                  $unwind: {
                    path: '$professional_service_id',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: "user_id",
                    foreignField: '_id',
                    as: 'user_id'
                  }
                },
                {
                  $unwind: {
                    path: '$user_id',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $lookup: {
                    from: 'services',
                    localField: 'service_details.service_id',
                    foreignField: '_id',
                    as: 'service_id'
                  }
                },
                {
                  $unwind: {
                    path: '$service_id',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $lookup: {
                    from: 'servicecategories',
                    localField: 'service_details.service_category_id',
                    foreignField: '_id',
                    as: 'service_category_id'
                  }
                },
                {
                  $unwind: {
                    path: '$service_category_id',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $lookup: {
                    from: 'servicesubcategories',
                    localField: 'service_details.service_sub_category_id',
                    foreignField: '_id',
                    as: 'service_sub_category_id'
                  }
                },
                {
                  $unwind: {
                    path: '$service_sub_category_id',
                    preserveNullAndEmptyArrays: true
                  }
                }

                // {
                //    $skip: data.offset ? +data.offset : 0
                // },
                // {
                //    $limit: data.limit ? +data.limit : Number.MAX_SAFE_INTEGER
                // }
              ],
              as: 'booking_id'
            }
          },
          {
            $match: condition
          }

        ])
        item.totalRecords = await countDocuments(collection, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getServiceDurtionList(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        const item = await getItemsCustom(model, condition,
          "",
          "country_id service_id service_category_id service_sub_category_id",
          { createdAt: -1 },
          data.limit,
          data.offset
        );
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getDetailsOfServiceDurtion(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {
          _id: mongoose.Types.ObjectId(data)
        }
        var agg = [
          {
            $lookup: {
              from: 'countries',
              localField: 'country_id',
              foreignField: '_id',
              as: 'country_details'
            }
          },
          {
            $unwind: {
              path: '$country_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$services',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true

            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: 'service_sub_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_sub_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        const item = await aggregateCollection(model, agg)
        resolve(item.data.length > 0 ? item.data[0] : null)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },

  async getskill(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        const condition = {};
        if (data.search) {
          data.search = data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          condition.name = data.search
        }
        var agg = [
          {
            $lookup: {
              from: 'services',
              localField: 'service_id',
              foreignField: '_id',
              as: 'service_details'
            }
          },
          {
            $unwind: {
              path: '$service_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'service_category_id',
              foreignField: '_id',
              as: 'service_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'servicesubcategories',
              localField: 'service_sub_category_id',
              foreignField: '_id',
              as: 'service_sub_category_details'
            }
          },
          {
            $unwind: {
              path: '$service_sub_category_details',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $match: condition
          },
          {
            $skip: data.offset ? +(data.offset) : 0
          },
          {
            $limit: data.limit ? +(data.limit) : 10
          }
        ]
        const item = await aggregateCollection(model, agg)
        item.totalRecords = await countDocuments(model, condition)
        resolve(item)
      } catch (error) {
        console.log(error)
        reject(buildErrObject(422, error.message))
      }
    })
  },


  async getSubscription(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.id) {
          items = await getItemCustom(model, { _id: data.id })
          resolve(items);
        }
        else {
          console.log('1');
          const condition = {}, aggregationPipeline = [], sort = data.sortBy === 'old' ? { createdAt: 1 } : { createdAt: -1 };
          if (data.status === 'all') { }
          else if (['unpaid', 'partially_paid', 'fully_paid'].includes(data.status)) condition.status = data.status;
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
              $match: condition
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
          resolve(items)
        }
      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async subscription(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items
        if (data.type == 'create') {
          items = await createItem(model, data)
          resolve(items)
        }
        if (data.type == 'update') {
          items = await updateItem(model, { _id: data.id }, data)
          resolve(items)
        }
        if (data.type == 'destroy') {
          items = await deleteItem(model, { _id: data.id })
          resolve(items)
        }
        if (data.type == 'get') {
          items = await this.getSubscription(model, data)
          resolve(items)
        }

      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getGarageUser(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items;
        if (data.id) {
          items = await getItemCustom(model, { _id: data.id })
          resolve(items);
        }
        else {
          console.log('1');
          const condition = {}, aggregationPipeline = [], sort = data.sortBy === 'old' ? { createdAt: 1 } : { createdAt: -1 };
          // if (data.status === 'all') {}
          // else if (['unpaid', 'partially_paid', 'fully_paid'].includes(data.status)) condition.status = data.status;
          aggregationPipeline.push(
            /*  {
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
              $match: condition
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
          resolve(items)
        }
      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },


  async garageUser(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items
        if (data.type == 'update') {
          items = await updateItem(model, { _id: data.id }, data)
          resolve(items)
        }
        if (data.type == 'get') {
          items = await this.getGarageUser(model, data)
          resolve(items)
        }

      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async userFeatures(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items
        if (data.type == 'update') {
          items = await updateItem(model, { _id: "65278f5c204c0e514eeb904c" }, data)
          resolve(items)
        }
        if (data.type == 'get') {
          items = await getItemThroughId(model, "65278f5c204c0e514eeb904c")
          resolve(items)
        }
        /*  if (data.type == 'create') {
           items = await createItem(model, data)
           resolve(items)
         } */

      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async getbookListingaccordingbookingid(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let user
        if (data._id) {
          let _id = mongoose.Types.ObjectId(data._id);
          user = await getItemThroughId(User, _id);
        } else {
          const data = data;
          let whereObj = {}

          if (data.booking_id) {
            whereObj = { _id: mongoose.Types.ObjectId(data.booking_id) }
          }
          const inputString = data.search;
          if (inputString) {
            whereObj.$or = [
              { "user_id.first_name": { $regex: data.search, $options: "i" } },
              { "user_id.last_name": { $regex: data.search, $options: "i" } },
              { "user_id.stage_name": { $regex: data.search, $options: "i" } },
              { "user_id.email": { $regex: data.search, $options: "i" } },
              { "user_id.base_location": { $regex: data.search, $options: "i" } },
              { "user_id.phone_number": { $regex: data.search, $options: "i" } },
            ];
          }
          if (data.startRange && data.endRange) {
            whereObj.$and = [
              { createdAt: { $gte: new Date(data.startRange) } },
              { createdAt: { $lte: new Date(data.endRange) } },
            ]
          }
          let order = { createdAt: -1 }
          if (data.order == "oldest") {
            order = { createdAt: 1 }
          } else if (data.order == "newest") {
            order = { createdAt: -1 }
          }
          user = await getItemsCustom(model, whereObj, "", "user_id artist_id event_location", order, data.limit, data.offset);
          user.count = await model.find(whereObj).count();
        }

      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async RoleMangement(model,data){
    return new Promise(async(resolve,reject)=>{
      try {
        let response;
        if(data.id){
          response = await getItemThroughId(model, data.id);
          resolve(response);
        }else{
          response = await getItemsCustom(model);
          resolve(response);
        }
      } catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    })
  },

  async roleManagement(model, data) {
    return new Promise(async (resolve, reject) => {
      try {
        let items
        if (data.type == 'create') {
          items = await createItem(model, data)
          resolve(items)
        }
        if (data.type == 'update') {
          items = await updateItem(model, { _id: data.id }, data)
          resolve(items)
        }
        if (data.type == 'destroy') {
          items = await deleteItem(model, { _id: data.id })
          resolve(items)
        }
        if (data.type == 'get') {
          items = await this.RoleMangement(model, data)
          resolve(items)
        }

      }
      catch (error) {
        console.log(error);
        reject(buildErrObject(422, error.message));
      }
    });
  },

  async checkPassword(password, admin) {
    return new Promise((resolve, reject) => {
      if (bcrypt.compareSync(password, admin.password)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  },

  async changeNewPassword(oldPassword, password, user) {
    return new Promise(async (resolve, reject) => {
      try {
        if (oldPassword === password) {
          throw buildErrObject(422, `Password not matched with old password`)
        } else {
          user.password = password;
          user.decoded_password = password;
          await user.save()
          resolve('updated');
        }
      } catch (err) {
        itemNotFound(err, user, reject, "NOT_FOUND");
      }
    });
  }



  /**************
  ***** VIBE ****
  **************
  */

};
