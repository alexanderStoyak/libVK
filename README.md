# lib-vk
<a href="https://www.npmjs.com/package/lib-vk"><img src="https://img.shields.io/npm/dt/lib-vk.svg?style=flat-square" alt="NPM downloads"></a>

## Features
- Quickly
- Compact
- Support for both callback and long polling at the same time

### NPM
```
npm i lib-vk
```

## Example usage
```js
/** process.env.TOKEN — group or page token
* process.env.GROUPID — group id (if the page token does not need to be specified)
* process.env.SECRET — secret key for working with callback
* process.env.PATH — path for receiving callback events
*/
const vk = new (require('lib-vk').VK)({token: process.env.TOKEN, groupId: process.env.GROUPID, secret: process.env.SECRET, path: process.env.PATH})

/** In the event location, you can specify an array of events that will be intercepted (For pages)
*    Example: ['messageNew', 'messageEdit']
*/ 
vk.track('messageNew', message => message.text == 'test' && vk.reply(message, 'This is a reply message') && vk.send(message, 'This is a normal message'))
```

## Calling methods
```js
const getUser = await vk.Query('users.get', {user_id: 1});

// Calling multiple methods at once 
const response = await vk.parallelExecute([[ 
  [
    ['messages.send', {chat_id: 1, random_id: 0, message: 'send 1'}],
    ['messages.send', {chat_id: 2, random_id: 0, message: 'send 2'}],
    ['users.get', {user_ids: [1, 2, 3]}]
  ]
]])
```

## Implementation of the «kick» command on «parallelExecute» (Instant execution)
```js
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
```

## The name of all events and their structure for pages
```
// Adding a new message.
* messageNew 
{
    'type'
    'id'
    'conversation_message_id'
    'peer_id'
    'date'
    'text'
}

// Edit the message.
* messageEdit 
{
    'type'
    'id'
    'conversation_message_id'
    'peer_id'
    'date'
    'text'
}


// Reading all outgoing messages in $peerId that arrived before the message with $localId
* ReadingAllOutMessages 
{
    'type'
    'peerId'
    'localId'
}


// A friend of $userId has become online. The extra contains the platform ID.
// $timestamp — the time of the last action of the user $userId on the site.
* userOnline 
{
    'type'
    'userId'
    'extra'
    'timestamp'
}


// Friend $userId has become offline ($flags is 0 if the user has left the site and 1 if offline by timeout )
// $timestamp — the time of the last action of the user $userId on the site.
* userOffline 
{
    'type'
    'userId'
    'flags'
    'timestamp'
}


// The user $userId is typing text in the dialog.
//  The event comes once every ~5 seconds when typing. $flags = 1.
* messageTyping 
{
    'type'
    'userId'
    'flags'
}


// The user $userId types text in the conversation $chatId. 
* messageTypingIsChat 
{
    'type'
    'userId'
    'chatId'
}


// Users $userIds type text in the conversation $peerId.
// A maximum of five conversation participants are transmitted, the total number of printers is indicated in $totalCount.
// $ts is the time when this event was generated.
* messageTypingsIsChat 
{
    'type'
    'userIds'
    'peerId'
    'totalCount'
    'ts'
}


// Users $userIds record an audio message in the conversation $peerId.
* recordsAudiomessage 
{
    'type'
    'userIds'
    'peerId'
    'totalCount'
    'ts'
}
```

> Если вам есть что предложить прошу написать мне [VK](https://vk.com/alexander_stoyak)