// aws s3 with contabo config

const aws = require('aws-sdk')
const s3 = new aws.S3({
  endpoint: process.env.CONTABO_END_POINT,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY_ID,
  s3BucketEndpoint: true
})

const uploadImage = async (imageFile) => {
  if (!imageFile) return null

  const { name, mimetype, data } = imageFile
  const fileContent = Buffer.from(data, 'binary')

  const fileExtension = name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}.${fileExtension}`
  const fileKey = `images/${fileName}`

  const putParams = {
    Bucket: 'eurobase-media',
    Key: fileKey,
    Body: fileContent,
    ACL: 'public-read',
    ContentType: mimetype
  }

  try {
    await s3.putObject(putParams).promise()
    const imagePath = `${process.env.CONTABO_END_POINT_IMAGE}/${putParams.Key}`
    console.log('Image uploaded successfully:', imagePath)
    return imagePath
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image')
  }
}

module.exports = {uploadImage}
