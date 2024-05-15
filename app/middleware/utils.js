const mongoose = require("mongoose");
const requestIp = require("request-ip");
const { validationResult } = require("express-validator");
const { admin } = require("./../../config/firebase");
var pdf = require("html-pdf");
var fs = require("fs");
var path = require("path");
const xlsx = require("xlsx");
const fastCsv = require("fast-csv");

/**
 * Removes extension from file
 * @param {string} file - filename
 */
exports.removeExtensionFromFile = (file) => {
  return file.split(".").slice(0, -1).join(".").toString();
};

/**
 * Gets IP from user
 * @param {*} req - request object
 */
exports.getIP = (req) => requestIp.getClientIp(req);

/**
 * Gets browser info from user
 * @param {*} req - request object
 */
exports.getBrowserInfo = (req) => req.headers["user-agent"];

/**
 * Gets country from user using CloudFlare header 'cf-ipcountry'
 * @param {*} req - request object
 */
exports.getCountry = (req) =>
  req.headers["cf-ipcountry"] ? req.headers["cf-ipcountry"] : "XX";

/**
 * Handles error by printing to console in development env and builds and sends an error response
 * @param {Object} res - response object
 * @param {Object} err - error object
 */
exports.handleError = (res, err) => {
  // Prints error in console
  if (process.env.NODE_ENV === "development") {
    console.log(err);
  }
  // Sends error to user
  res.status(err.code).json({
    errors: {
      msg: err.message,
    },
    code: err.code,
  });
};

/**
 * Builds error object
 * @param {number} code - error code
 * @param {string} message - error text
 */
exports.buildErrObject = (code, message) => {
  return {
    code,
    message,
  };
};

/**
 * Builds error for validation files
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - next object
 */
exports.validationResult = (req, res, next) => {
  try {
    validationResult(req).throw();
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase();
    }
    return next();
  } catch (err) {
    return this.handleError(res, this.buildErrObject(422, err.array()));
  }
};

/**
 * Builds success object
 * @param {string} message - success text
 */
exports.buildSuccObject = (message) => {
  return {
    msg: message,
  };
};

/**
 * Checks if given ID is good for MongoDB
 * @param {string} id - id to check
 */
exports.isIDGood = async (id) => {
  return new Promise((resolve, reject) => {
    const goodID = mongoose.Types.ObjectId.isValid(id);
    return goodID
      ? resolve(id)
      : reject(this.buildErrObject(422, "ID_MALFORMED"));
  });
};

/**
 * Item not found
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemNotFound = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message));
  }
  if (!item) {
    reject(this.buildErrObject(422, message));
  }
};

/**
 * Item already exists
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemAlreadyExists = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message));
  }
  if (item) {
    reject(this.buildErrObject(422, message));
  }
};

exports.itemExists = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message));
  }
  if (!item) {
    reject(this.buildErrObject(422, message));
  }
};

exports.objectToQueryString = async (obj) => {
  return new Promise((resolve, reject) => {
    const searchParams = new URLSearchParams();
    const params = obj;
    Object.keys(params).forEach((key) => searchParams.append(key, params[key]));
    resolve(searchParams.toString());
  });
};

/**
 * Fetch country code from data
 * @param {Object} obj - Country Info
 */
exports.getCountryCode = (obj) => {
  return {
    country_code: obj.country,
  };
};

exports.uploadFileLocal = (object) => {
  const self = this;
  return new Promise((resolve, reject) => {
    const obj = object.file_data;
    let name = Date.now() + obj.name;
    obj.mv(`${object.path}/${name}`, (err) => {
      if (err) {
        reject(self.buildErrObject(422, err.message));
      }
      resolve(name);
    });
  });
};

/**
 * Notification
 */

exports.sendPushNotification = async (
  tokens,
  title,
  message,
  notificationData
) => {
  try {
    if (notificationData.sender_id)
      notificationData.sender_id = notificationData.sender_id.toString();

    if (notificationData.receiver_id)
      notificationData.receiver_id = notificationData.receiver_id.toString();
    if (notificationData.value_id)
      notificationData.value_id = notificationData.value_id.toString();
    const notification = {
      title: title,
      description: message,
      // image: notificationData.icon
      //   ? notificationData.icon
      //   : `${process.env.NOTIFICATION_ICONS_PATH}/default.ico`,
    };

    console.log(notification);
    var message = {
      notification: notification,
      data: notificationData,
      tokens: tokens,
    };
    console.log("final message", message);
    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(tokens[idx]);
            }
          });
          console.log("List of tokens that caused failures: " + failedTokens);
        }
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.downloadPdfFile = async (filePath, data, publicPath) => {
  try {
    const contents = await fs.readFileSync(`./views/en/${filePath}`, "utf8");
    var html = await ejs.render(contents, { data });

    const fileName = "customers" + Date.now();
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
        `public_v1/${publicPath}/` + fileName + ".pdf",
        async function (err, pdfV) {
          if (err) {
            console.log(err);
            return res.status(500).send("Error generating PDF");
          }

          const fullPath =
            process.env.API_URL2 +
            `public_v1/${publicPath}/` +
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
  } catch (err) {
    console.log(err);
  }
};
exports.downloadExcelFile = async (wsData, publicPath, res) => {
  try {
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");

    const fileName = "customers" + Date.now();
    const fullPath = `public_v1/${publicPath}` + fileName + ".xlsx";

    xlsx.writeFile(wb, fullPath);

    const filename = path.basename(fullPath);
    const contentType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.setHeader("Content-type", contentType);

    const filestream = fs.createReadStream(fullPath);

    filestream.on("open", function () {
      filestream.pipe(res);
    });

    filestream.on("end", () => {
      fs.unlink(fullPath, (err) => {
        if (err) throw err;
        console.log("successfully deleted ", fullPath);
      });
    });

    filestream.on("error", (err) => {
      console.log(err);
      return res.status(500).send("Error reading Excel file");
    });
  } catch (err) {
    console.log(err);
  }
};
exports.downloadCSVFile = async (csvData, res) => {
  try {
    // const csvStream = fastCsv.format({ headers: true });
    // const writableStream = fs.createWriteStream(fullPath);

    // csvStream.pipe(writableStream);

    // csvData.forEach((row) => {
    //   csvStream.write(row);
    // });

    // csvStream.end();

    // writableStream.on("finish", () => {
    //   const filename = path.basename(fullPath);
    //   const contentType = "text/csv";

    //   res.setHeader("Content-disposition", "attachment; filename=" + filename);
    //   res.setHeader("Content-type", contentType);

    //   const filestream = fs.createReadStream(fullPath);

    //   filestream.on("open", function () {
    //     filestream.pipe(res);
    //   });

    //   filestream.on("end", () => {
    //     fs.unlink(fullPath, (err) => {
    //       if (err) throw err;
    //       console.log("successfully deleted ", fullPath);
    //     });
    //   });

    //   filestream.on("error", (err) => {
    //     console.log(err);
    //     return res.status(500).send("Error reading CSV file");
    //   });
    // });
    // const fileName = "customers" + Date.now() + ".csv";
    // const fullPath = path.join("public_v1/customersList/", fileName);
    const fileName = "reapairs" + Date.now() + ".csv";
    const fullPath = path.join(`public_v1/repairList/`, fileName);

    const csvStream = fastCsv.format({ headers: true });
    const writableStream = fs.createWriteStream(fullPath);

    csvStream.pipe(writableStream);

    csvData.forEach((row) => {
      csvStream.write(row);
    });

    csvStream.end();

    writableStream.on("finish", () => {
      const filename = path.basename(fullPath);
      const contentType = "text/csv";

      res.setHeader("Content-disposition", "attachment; filename=" + filename);
      res.setHeader("Content-type", contentType);

      const filestream = fs.createReadStream(fullPath);

      filestream.on("open", function () {
        filestream.pipe(res);
      });

      filestream.on("end", () => {
        fs.unlink(fullPath, (err) => {
          if (err) throw err;
          console.log("successfully deleted ", fullPath);
        });
      });

      filestream.on("error", (err) => {
        console.log(err);
        return res.status(500).send("Error reading CSV file");
      });
    });
  } catch (err) {
    console.log(err);
  }
};

exports.checkDynamicPermissions = (req, res, next) => {
  console.log(req.user);
  const userRole = req.user.role || "user";
  const rolePermissions = {
    user: [
      "Access_Calendar",
      "Access_Dashboard",
      "Access_Quote",
      "Access_Free_Quote",
      "Access_Service",
      "Access_Profile",
      "Access_Invoice",
      "Access_Client",
      "Access_Top_Clients",
      "Access_Notifications",
      "Access_User_Authorization",
      "Access_MyData",
      "Access_Car_List",
    ],
    support: ["Access_Quote", "Access_Free_Quote"],
  };

  const userPermissions = req.user.permissions || [];

  // Extract the operation type from the request (in this case, from the query parameters)
  const operationType = req.query.type;

  // Get the required permissions based on the user role and operation type
  const requiredPermissions = rolePermissions[userRole] || [];
  const dynamicPermissions = rolePermissions[operationType] || [];

  // Combine the required permissions with dynamic permissions
  const allRequiredPermissions = [
    ...requiredPermissions,
    ...dynamicPermissions,
  ];

  console.log("userPermissions", userPermissions);
  console.log("allRequiredPermissions", allRequiredPermissions);

  // Check if the user has all the required permissions
  const hasRequiredPermissions = allRequiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );

  if (hasRequiredPermissions) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  }
};
