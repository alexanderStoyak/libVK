const { VK } = require('./libVK.js');
module.exports = new VK({token: process.env.TOKEN, groupId: process.env.GROUPID, secret: process.env.SECRET});