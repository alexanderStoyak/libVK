/** process.env.TOKEN — group or page token
* process.env.GROUPID — group id (if the page token does not need to be specified)
* process.env.SECRET — secret key for working with callback
* process.env.PATH — path for receiving callback events
*/
const vk = new (require('./../libVK.js').VK)({token: process.env.TOKEN, groupId: process.env.GROUPID, secret: process.env.SECRET, path: process.env.PATH})


vk.track('message_new', newMessage => newMessage.text == 'test' && vk.reply(newMessage, 'This is a reply message') && vk.send(newMessage, 'This is a normal message'))
