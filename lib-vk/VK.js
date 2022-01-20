const axios = require('axios').default;
const callback = require('express')();
const bodyParser = require('body-parser');
const httpAgent = new (require('http')).Agent({ keepAlive: true });
const Message = require('./Message');


class VK
{
    constructor(options) 
    {
        if(options.longPoll) 
        {
            this.groupId = options.longPoll.groupId;
            this.token = options.longPoll.token;
        }

        if(options.callback) 
        {
            this.secret = options.callback.secret;
            this.path = options.callback.path;
            callback.use(bodyParser.json()) && callback.listen(80);
        }


        // default..
        this.arrayKey = new Map();
    }


    /** Executing multiple methods at a time 
    *   Returns an array of received responses from methods
    *    Example of a structure:
    *     [constant].parallelExecute([ [ [ [ 'name of the method', {parameter object}], .. ], 'Working with answers [this]' ], .. ])
    */
    async parallelExecute(params = []) 
    {
        return this.Query('execute', {code: `
            var refunds = [];
            ${params.map(element => 
                `var this = [${element[0].map(x=> `API.${x[0]}(${JSON.stringify(x[1])})`).join(',')}]${element[1] ? ';' : ''}
                ${element[1] ? `refunds.push([this, API.${element[1]}])` : ''}`).join(';')};
            return refunds;
        `});
    }


    /** excludes a person or people from the conversation:
     *   [constant].chatKick([ids array])
     *    newMessage.chatKick([1, 2, 3])
    */
    async chatKick(message, ids = []) 
    {
        return Array.isArray(ids) 
            ? this.parallelExecute([[ ids.map(x => { return ['messages.removeChatUser', {chat_id: message.peer_id - 2000000000, member_id: x}] }) ]])
            : this.Query('messages.removeChatUser', {chat_id: message.peer_id - 2000000000, member_id: ids});
    }


    /** simplified message sending, example: 
    *    [constant].send({incoming message object}, 'Hello!')
    *      newMessage.send('Hello!')
    * 
    *    or 
    *     [constant].send({parameter object})
    *      newMessage.send({message: 'Hello!', chat_id: 1, random_id: 0})
    */
    async send(message, params = {})
    {
        return this.Query('messages.send', typeof params === 'string' ? {message: params, peer_id: message.peer_id, random_id: 0} : (params.chat_id ? params : (params.peer_id ? params : (params.peer_id = message.peer_id) && params)));
    }

    
    // sends a reply message, the parameters are similar in meaning to «send»
    reply(message, params = {}) 
    {
        return this.send(message, {
            random_id: 0,
            forward: JSON.stringify({
            ...(this.conversation_message_id ? { conversation_message_ids: message.conversation_message_id } : { message_ids: message.id }),
            peer_id: message.peer_id,
            is_reply: true
        }), 
        ...(typeof params === 'string' ? ({message: params}) : params)});
    }


    /** how to use
    *    [constant].track('event name', function => {})
    *     VK.track('message_new', newMessage => VK.reply(newMessage, 'Hello!'))
    */
    async track(type, func) 
    {
        (this.secret && this.path) && callback.post(this.path, (req, res) => 
        {
            const update = req.body;
            if(update.type === 'confirmation') return res.send(this.secret);
            !this.arrayKey.has(update.event_id) && (this.eventPush(update, [type, func]) || this.arrayKey.set(update.event_id));
            return res.send('OK');
        });

        let {key, server, ts} = (await this.Query(this.groupId ? 'groups.getLongPollServer' : 'messages.getLongPollServer', {[this.groupId ? 'group_id' : 'lp_version']: this.groupId ?? 3})).response;
        while (true)
        {
            const response = (await axios.get(this.groupId ? server : 'https://' + server, {params: {key: key, act: 'a_check', wait: 25, ts: ts, mode: '2 | 8 | 32 | 64 | 128', version: 3 , httpAgent: httpAgent}})).data;
            ts = response.ts;
            if(response.updates) for (const update of response.updates) {(!this.path || !this.arrayKey.has(update.event_id)) && (this.eventPush(this.groupId ? update : new Message(update), [type, func]) || this.arrayKey.set(update.event_id))};
        };
    }
    

    
    // a chat message?
    isChat(message)
    {
        return message.peer_id > 2e9;
    }


    // checking for a reply message
    hasReply(message)
    {
        return !!message.reply_message;
    }


    /** calling methods, example: 
    *    [constant].Query('name of the method', {parameter object})
    *      newMessage.Query('messages.send', {random_id: 0, chat_id: 1, message: 'Hello!'}) 
    */
    async Query(method, params)
    {
        return (await axios.get(`https://api.vk.com/method/${method}`, {params: {access_token: this.token, v: '5.131', ...params}})).data;
    }


    async loadingMessage(message) 
    {
        return (await this.Query('messages.getById', {message_ids: [message.id]})).response.items[0];
    }


    /** sending events to your function
    *    @param {update} — the object of the new event
    *    @param {key} — the key stores the name of your event (key[0]) and the function (key[1])
    */
    eventPush(update, key) 
    {
        (key[0].includes(update.type) || !key[0]) && key[1](update.object ? update.object.message : update); this.arrayKey.size >= 150 && this.arrayKey.clear()
    }
}

exports.VK = VK;