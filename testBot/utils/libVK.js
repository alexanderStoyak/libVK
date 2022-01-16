const axios = require('axios').default;
const callback = require('express')();
const bodyParser = require('body-parser');
const httpAgent = new (require('http')).Agent({ keepAlive: true });




class Utils
{

    // a chat message?
    isChat(message) 
    {
        return message.id === 0;
    }
    
    
    // checking for a reply message
    hasReply(message) 
    {
        return message.reply_message ? true : false;
    }

    /** Executing multiple methods at a time 
    *   Returns an array of received responses from methods
    *    Example of a structure:
    *     [constant].parallelExecute([ [ [ [ 'name of the method', {parameter object}], .. ], 'Working with answers [this]' ], .. ])
    */
    async parallelExecute(params = []) 
    {
        return (await this.Query('execute', {code: `
            var refunds = [];
            ${params.map(element => 
                `var this = [${element[0].map(x=> `API.${x[0]}(${JSON.stringify(x[1])})`).join(',')}]${element[1] ? ';' : ''}
                ${element[1] ? `refunds.push([this, API.${element[1]}])` : ''}`)
            .join(';')};
            return refunds;
        `}));
    }

}



class VK extends Utils
{

    constructor(options) 
    {
        super(Utils)

        this.groupId = options.groupId;
        this.token = options.token;
        this.secret = options.secret;
        if(this.secret) 
        {
            callback.use(bodyParser.json());
            callback.listen(80);
        }
        this.path = options.path;

        // default..
        this.arrayKey = new Map();
    }


    /** calling methods, example: 
    *    [constant].Query('name of the method', {parameter object})
    *      VK.Query('messages.send', {random_id: 0, chat_id: 1, message: 'Hello!'}) 
    */
    async Query(method, params)
    {
        return (await axios.get(`https://api.vk.com/method/${method}`, {params: {access_token: this.token, v: '5.131', ...params}})).data;
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
            !this.arrayKey.has(update.event_id) && (this.eventPush(update, [type, func]) || this.arrayKey.set(update.event_id));
            return res.send('OK');
        });

        let {key, server, ts} = (await this.Query(this.groupId ? 'groups.getLongPollServer' : 'messages.getLongPollServer', {[this.groupId ? 'group_id' : 'lp_version']: this.groupId ?? 3})).response;
        while (true)
        {
            const response = (await axios.get(this.groupId ? server : 'https://' + server, {params: {key: key, act: 'a_check', wait: 25, ts: ts, mode: 64, version: 3 , httpAgent: httpAgent}})).data;
            ts = response.ts;
            if(response.updates) for (const update of response.updates) {!this.arrayKey.has(update.event_id) && (this.eventPush(update, [type, func]) || this.arrayKey.set(update.event_id))};
        };
    }


    /** simplified message sending, example: 
    *    [constant].send([incoming message object], 'Hello!')
    *      VK.send(newMessage, 'Hello!')
    * 
    *    or 
    *     [constant].send({parameter object})
    *      VK.send({message: 'Hello!', chat_id: 1, random_id: 0})
    */
    async send(message, params = {})
    {
        return this.Query('messages.send', typeof params === 'string' ? {message: params, peer_id: message.peer_id, random_id: 0} : params.chat_id ? params : (params.peer_id ? params : (params.peer_id = message.peer_id) && params));
    }


    // sends a reply message, the parameters are similar in meaning to «send»
    reply(message, params = {}) 
    {
        return this.send(message, {
            random_id: 0,
            forward: JSON.stringify({
            ...(message.conversation_message_id ? { conversation_message_ids: message.conversation_message_id } : { message_ids: message.id }),
            peer_id: message.peer_id,
            is_reply: true
        }), 
        ...(typeof params === 'string' ? ({message: params}) : params)});
    };


    /** sending events to your function
    *    @param {update} — the object of the new event
    *    @param {key} — the key stores the name of your event (key[0]) and the function (key[1])
    */
    eventPush(update, key) {update.type === key[0] && key[1](update.object.message); this.arrayKey.size >= 150 && this.arrayKey.clear()}

};

exports.VK = VK;