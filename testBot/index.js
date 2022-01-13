const vk = require('./utils/VK');

vk.on('message_new', message => message.text == 'hello' && vk.reply('Hello!', message))