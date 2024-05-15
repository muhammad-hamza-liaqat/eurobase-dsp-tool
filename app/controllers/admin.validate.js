const { validationResult } = require('../middleware/utils')
const validator = require('validator')
const { check } = require('express-validator')

// exports.addSubAdmin = [
//     check('name')
//         .exists()
//         .withMessage('MISSING')
//         .not()
//         .isEmpty()
//         .withMessage('IS_EMPTY'),
//     check('email')
//         .exists()
//         .withMessage('MISSING')
//         .not()
//         .isEmpty()
//         .withMessage('IS_EMPTY')
//         .isEmail()
//         .withMessage('EMAIL_IS_NOT_VALID'),
//     check('phone')
//         .exists()
//         .withMessage('MISSING')
//         .not()
//         .isEmpty()
//         .withMessage('IS_EMPTY'),
//     check('address')
//         .exists()
//         .withMessage('MISSING')
//         .not()
//         .isEmpty()
//         .withMessage('IS_EMPTY'),
//     (req, res, next) => {
//         validationResult(req, res, next)
//     }
// ]

