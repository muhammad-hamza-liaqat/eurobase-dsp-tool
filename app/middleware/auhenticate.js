// middleware/authenticate
const jwt = require('jsonwebtoken')

const authenticateUser = (requiredRoles) => (req, res, next) => {
  const token = req.headers.authorization

  if (!token || !token.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Unauthorized - Invalid token format' })
  }

  const tokenString = token.split(' ')[1]
  const secretKey = process.env.JWT_SECRET
  console.log(tokenString,"token string")
  jwt.verify(
    tokenString,
    secretKey,
    { algorithms: ['HS256'] },
    (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json({ message: 'Unauthorized - Token has expired' })
        }

        console.error('JWT Verification Error:', err.message)
        return res.status(401).json({ message: 'Unauthorized - Invalid token' })
      }

      const { user } = decoded
      req.user = user

      if (
        !(
          user &&
          (requiredRoles.includes(user.role) || user.role === 'superuser')
        )
      ) {
        return res
          .status(403)
          .json({ message: 'Forbidden - Insufficient role' })
      }

      next()
    }
  )
}

module.exports = authenticateUser
