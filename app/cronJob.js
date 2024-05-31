const cron = require("node-cron")
const Sub_user = require("./models/sub_user");
const updateExpiredAccounts = async () => {
    console.log("inside cron job function ----..................................................")
    try {
        const currentTime = new Date();
        const expiredUsers = await Sub_user.find({ expiryTime: { $lt: currentTime }, token: { $ne: null }, is_active: "pending" });

        for (const user of expiredUsers) {
            user.token = null;
            user.expiryTime = null;
            user.is_active = "locked"
            await user.save();
        }

        console.log("Expired accounts updated successfully.---> cron job done");
    } catch (error) {
        console.error("Error updating expired accounts:", error);
    }
};

cron.schedule('*/3 * * * *', updateExpiredAccounts)

console.log("hello i am cron job running after every 3 minutes")

module.exports = { updateExpiredAccounts }