const fetchPromise = import('node-fetch').then(mod => mod.default);
const fetch = (url, init) => (Promise.resolve(fetchPromise).then(fn => fn(url, init)));
const url = require('url');
const callback = require('express')();
const bodyParser = require('body-parser');
callback.use(bodyParser.json());
callback.listen(80);


class VK 
{
    constructor(options) 
    {
        this.groupId = options.groupId;
        this.token = options.token;
        this.secret = options.secret;
        this.push = options.push;

        // default..
        this.type = options.type;
        this.arrayKey = new Map();;
    }


    /** calling methods, example: 
    *    [constant].Query('name of the method', {parameter object})
    *      VK.Query('messages.send', {random_id: 0, chat_id: 1, message: 'Hello!'}) */
    async Query(method, params) 
    {
        return (await fetch(`https://api.vk.com/method/${method}`, 
        {
            method: 'POST',
            compress: false,
            timeout: 10e3,
            headers: {
                connection: 'keep-alive',
            },
            body: new url.URLSearchParams({
                access_token: this.token,
                v: '5.103',
                ...params
            })
        })).json();
    }


    /** how to use
    *    [constant].on('event name', (function) => {})
    *     VK.on('message_new', (newMessage) => VK.reply('Hello!', newMessage))
    */
    async on(type, func) 
    {
        this.secret && callback.post(this.push, (req, res) => {
            let update = req.body;
            if(update.type === 'confirmation') return res.send(this.secret)
            !this.arrayKey.has(update.event_id) && (this.eventPush(update, [type, func]) || this.arrayKey.set(update.event_id))
            return res.send('ok');
        })

        const {key, server, ts} = (await this.Query(this.groupId ? 'groups.getLongPollServer' : 'messages.getLongPollServer', {[this.groupId ? 'group_id' : 'lp_version']: this.groupId ?? 3})).response;
        this.url = new url.URL(this.groupId ? server : 'https://' + server);
        this.url.search = new url.URLSearchParams({key, act: 'a_check', wait: 25, ts: ts, mode: 64, version: 3})

        while (true)
        {
            const response = await (await fetch(this.url, { method: 'GET', compress: false, headers: {connection: 'keep-alive'}}) ).json();
            this.url.searchParams.set('ts', response.ts);
            if(response.updates) for (const update of response.updates) {!this.arrayKey.has(update.event_id) && (this.eventPush(update, [type, func]) || this.arrayKey.set(update.event_id))}
        }
    }


    /** simplified message sending, example: 
    *    [constant].send('Hello!', [incoming message object])
    *      VK.send('Hello!', newMessage)
    * 
    *    or 
    *     [constant].send({parameter object})
    *      VK.send({message: 'Hello!', chat_id: 1, random_id: 0})
    */
    async send(params = {}, message)
    {
        return this.Query('messages.send', typeof params === 'string' ? {message: params, peer_id: message.peer_id, random_id: 0} : params.chat_id ? params : (params.peer_id ? params : (params.peer_id = message.peer_id) && params));
    }


    // sends a reply message, the parameters are similar in meaning to <send>
    reply(params = {}, message) 
    {
        return this.send({
            forward: JSON.stringify({
            ...(message.conversation_message_id ? { conversation_message_ids: message.conversation_message_id } : { message_ids: message.id }),
            peer_id: message.peer_id,
            is_reply: true
        }), 
        ...(typeof params === 'string' ? ({message: params}) : params)},
        message);
    };


    /** sending events to your function
    *    @param {update} — the object of the new event
    *    @param {key} — the key stores the name of your event (key[0]) and the function (key[1])
    */
    eventPush(update, key) {update.type === key[0] && key[1](update.object.message); this.arrayKey.size >= 150 && this.arrayKey.clear()}
};

exports.VK = VK;