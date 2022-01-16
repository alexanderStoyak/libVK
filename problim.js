const axios = require('axios').default;
const callback = require('express')();
const bodyParser = require('body-parser');
const httpAgent = new (require('http')).Agent({ keepAlive: true });

const typeMessage = {
    4: 'message_new',
    5: 'message_edit',
    61: 'message_typing'
}

const messageStuct = [
    'type',
    'message_id',
    'conversation_message_id',
    'peer_id',
    'date',
    'text'
]



class VK
{

    constructor(options) 
    {

        this.groupId = options.groupId;
        this.token = options.token;
        this.secret = options.secret ? (callback.use(bodyParser.json()) && callback.listen(80) && options.secret) : options.secret;
        this.path = options.path;

        // default..
        this.arrayKey = new Map();

    }


    /** how to use
    *    [constant].track('event name', function => {})
    *     VK.track('message_new', newMessage => VK.reply(newMessage, 'Hello!'))
    */
    async track(type, func) 
    {
        this.secret && callback.post(this.path, (req, res) => 
        {
            const update = req.body;
            if(update.type === 'confirmation') return res.send(this.secret);
            !this.arrayKey.has(update.event_id) && (this.eventPush(new NewMessage(update), [type, func]) || this.arrayKey.set(update.event_id));
            return res.send('OK');
        });

        let {key, server, ts} = (await this.Query(this.groupId ? 'groups.getLongPollServer' : 'messages.getLongPollServer', {[this.groupId ? 'group_id' : 'lp_version']: this.groupId ?? 3})).response;
        while (true)
        {
            const response = (await axios.get(this.groupId ? server : 'https://' + server, {params: {key: key, act: 'a_check', wait: 25, ts: ts, mode: 64, version: 3 , httpAgent: httpAgent}})).data;
            ts = response.ts;
            if(response.updates) for (const update of response.updates) {!this.arrayKey.has(update.event_id ?? update[4]) && (this.eventPush(new NewMessage(update), [type, func]) || this.arrayKey.set(update.event_id ?? update[4]))};
        };
    }
    

    /** calling methods, example: 
    *    [constant].Query('name of the method', {parameter object})
    *      newMessage.Query('messages.send', {random_id: 0, chat_id: 1, message: 'Hello!'}) 
    */
    async Query(method, params)
    {
        return (await axios.get(`https://api.vk.com/method/${method}`, {params: {access_token: this.token, v: '5.131', ...params}})).data;
    }


    /** sending events to your function
    *    @param {update} — the object of the new event
    *    @param {key} — the key stores the name of your event (key[0]) and the function (key[1])
    */
    eventPush(update, key) 
    {
        console.log(update)
        update.type === key[0] && key[1](update.object ? update.object.message : update); this.arrayKey.size >= 150 && this.arrayKey.clear()
    }

}



class NewMessage
{
    constructor (message) 
    {
        if(message.object)
        {
            this.type = message.type;
            for (const key in message.object.message) 
            {
                this[key] = message.object.message[key];
            }
        } 
        else 
        {
            if(typeMessage[message[0]] === 'message_new') {
                messageStuct.forEach((param, index) => this[param] = message[index])
                this.type = typeMessage[message[0]];
                this.isChat && (this.conversation_message_id = 0)
            }
        }
    }


    // a chat message?
    get isChat() 
    {
        return this.peer_id > 2e9;
    }


    // checking for a reply message
    get hasReply() 
    {
        return this.reply_message ? true : false;
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
    async chatKick(ids = []) 
    {
        return Array.isArray(ids) 
            ? this.parallelExecute([[ ids.map(x => { return ['messages.removeChatUser', {chat_id: this.peer_id - 2000000000, member_id: x}] }) ]])
            : this.Query('messages.removeChatUser', {chat_id: this.peer_id - 2000000000, member_id: ids});
    }


    /** simplified message sending, example: 
    *    [constant].send({incoming message object}, 'Hello!')
    *      newMessage.send('Hello!')
    * 
    *    or 
    *     [constant].send({parameter object})
    *      newMessage.send({message: 'Hello!', chat_id: 1, random_id: 0})
    */
    async send(params = {})
    {
        return this.Query('messages.send', typeof params === 'string' ? {message: params, peer_id: this.peer_id, random_id: 0} : params.chat_id ? params : (params.peer_id ? params : (params.peer_id = this.peer_id) && params));
    }

    
    // sends a reply message, the parameters are similar in meaning to «send»
    reply(params = {}) 
    {
        return this.send(this, {
            random_id: 0,
            forward: JSON.stringify({
            ...(this.conversation_message_id ? { conversation_message_ids: this.conversation_message_id } : { message_ids: this.id }),
            peer_id: this.peer_id,
            is_reply: true
        }), 
        ...(typeof params === 'string' ? ({message: params}) : params)});
    }

}


exports.VK = VK;