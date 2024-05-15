const mongoose = require('mongoose')
const PricesSchema = new mongoose.Schema(
  {
    dsp: {
      dspPanel: String,
      aluminiumDspPanel: String,
      dspDiscount: String,
    },
    hail: {
      hourlyRate: String,
      hailDiscount: String,
    },
    polishing: {
      dspPanel: String,
      aluminiumDspPanel: String,
      dspDiscount: String,
    },
   
    
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
)



module.exports = mongoose.model('Prices', PricesSchema)
