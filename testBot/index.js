/** process.env.TOKEN — group or page token
* process.env.GROUPID — group id (if the page token does not need to be specified)
* process.env.SECRET — secret key for working with callback
* process.env.PATH — path for receiving callback events
*/
const vk = new (require('./utils/libVK').VK)({token: process.env.TOKEN, groupId: process.env.GROUPID, secret: process.env.SECRET, path: process.env.PATH})


vk.track('message_new', message => {
    
    if(message.text === '!kick') {
        if(!vk.hasReply(message)) return vk.reply(message, 'Нужно ответить на сообщение кого исключить');
      
        return vk.parallelExecute([
          [
            [['messages.removeChatUser', {member_id: message.reply_message.from_id, chat_id: message.peer_id - 2000000000}],
            ['users.get', {user_ids: message.reply_message.from_id}]],
              `messages.send({random_id: 0, message: !this[0] 
                ? ("Не могу исключить ${message.reply_message.from_id > 0 ? '@id" + this[1][0].id + " (этого пользователя)"' 
                  : `@club${message.reply_message.from_id * -1} (это сообщество)"`}) 
                    : (" ${message.reply_message.from_id > 0 ? ' @id" + this[1][0].id + "(" + this[1][0].first_name + ") исключён"' 
                      : ` Исключил @club${message.reply_message.from_id * -1} (это сообщество)"`}),
           chat_id: ${message.peer_id - 2000000000}})`
           ]
        ])
      }

})