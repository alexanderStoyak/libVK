const { fetch } = require('undici'),
{ App: uWS, us_listen_socket_close: serverClose } = require('./utils/uWebSockets/uws'),
Message = require('./message'),
now = require("performance-now"),
readJson = require('./utils/readJson')


class VK
{
    constructor(options = {})
    {
        options.longPoll && (this.token = options.longPoll.token) && (this.groupId = options.longPoll.groupId)
        options.callback && (this.callback = {secret: options.callback.secret, listenSocket: {}, port: options.callback.port ?? 80, path: options.callback.path})


        // default..
        this.paramsQueryVK = {ts: 0, server: '', key: ''},
        this.mapKeys = new Map(),
        this.mapCallbacks = [],
        this.startGetingNewEvents = {longPoll: true, callback: true}
        this.#start()
    }


    /** Executing multiple methods at a time
    *
    * @param params
    * @returns {Promise<*>}
    *
    * Returns an array of received responses from methods
    * Example of a structure:
    * `[constant].parallelExecute([ [ [ [ 'name of the method', {parameter object}], .. ], 'Working with answers [this]' ], .. ])`
    */
    parallelExecute(params = []) 
    {
        return this.Query('execute', {code: `
            var refunds = [];
            ${params.map(element =>
                `var this = [${element[0].map(x => `API.${x[0]}(${JSON.stringify(x[1])})`).join(',')}];
                ${element[1] ? `refunds.push([this, API.${element[1]}])` : 'refunds.push([this])'}`).join(';')};
            return refunds;`
        })
    }


    /** excludes a person or people from the conversation:
    *
    * @param message
    * @param ids
    * @returns {Promise<Promise<*>|*>}
    *
    * `[constant].chatKick([ids array])
    * VK.chatKick([1, 2, 3])`
    */
    chatKick(message, ids = []) 
    {
        return Array.isArray(ids)
            ? this.parallelExecute([[ ids.map(x => { return ['messages.removeChatUser', {chat_id: message.peer_id - 2e9, member_id: x}] }) ]])
            : this.Query('messages.removeChatUser', {chat_id: message.peer_id - 2e9, member_id: ids})
    }


    /** simplified message sending, example:
    *
    * @param message
    * @param params
    * @returns {Promise<*>}
    *
    * `[constant].send({incoming message object}, 'Hello!')
    *   VK.send(message, 'Hello!')
    *
    *  or
    *   [constant].send({parameter object})
    *    VK.send({message: 'Hello!', chat_id: 1, random_id: 0})`
    */
    async send(message, params = {})
    {
        typeof params === 'object' && !(message.peer_id || message.peerId ? params.peer_id = message.peer_id ?? message.peerId : 0) && (params.chat_id = params.chat_id ?? params.chatId)
        return this.Query('messages.send', typeof params === 'string' ? {message: params, peer_id: message.peer_id, random_id: 0} : (params.chat_id ? params : (message.peer_id ? params : (params.peer_id = message.peer_id) && params)))
    }


    /** sends a reply message, the parameters are similar in meaning to «send»
    *
    * @param message
    * @param params
    * @returns {Promise<*>}
    */
    reply(message, params = {})
    {
        return this.send(message, {random_id: 0, forward: JSON.stringify({...(message.conversation_message_id ? { conversation_message_ids: message.conversation_message_id } : { message_ids: message.id }), peer_id: message.peer_id, is_reply: true}), ...(typeof params === 'string' ? ({message: params}) : params)})
    }


    /** start receiving new events
    *
    * @params type
    * @returns {Promise<void>}
    */
    async #start(type)
    {
        ((type === 'callback' || !type) && this.startGetingNewEvents.callback) && (this.callback.secret && this.callback.path) && 
            uWS().post(this.callback.path, (response, request) => {
                if(request.getHeader('x-retry-counter')) return response.end('OK');
                readJson(response, newEvent =>
                {
                    if(newEvent.type === 'confirmation') return response.end(this.callback.secret)
                    newEvent.object.message && (newEvent.object.message.test = {bornOfset: now(), modeEvent: 2});
                    !this.mapKeys.has(newEvent.event_id) && (this.#eventPush(newEvent) || this.mapKeys.set(newEvent.event_id))
                    return response.end('OK')
                })
            }).listen(this.callback.port, listenSocket => this.callback.listenSocket = listenSocket)


        if((type === 'longPoll' || !type) && this.startGetingNewEvents.longPoll)
            while(this.startGetingNewEvents.longPoll)
                for(let newEvent of await this.#getingUpdates())
                    {
                        newEvent.object && newEvent.object.message && (newEvent.object.message.test = {bornOfset: now(), modeEvent: 1});
                        (!this.callback.path || !this.mapKeys.has(newEvent.event_id)) && (this.#eventPush(this.groupId ? newEvent : new Message(newEvent)) || this.mapKeys.set(newEvent.event_id))
                    }
    }


    /** Getting new events
    *
    * @returns {Promise<[*]>}
    */
    async #getingUpdates()
    {
        !this.paramsQueryVK.key && 
            ({server: this.paramsQueryVK.server, key: this.paramsQueryVK.key, ts: this.paramsQueryVK.ts} = 
                (await this.Query(this.groupId ? 'groups.getLongPollServer' : 'messages.getLongPollServer',
                    {
                        [this.groupId ? 'group_id' : 'lp_version']: this.groupId ?? 3
                    })
                .catch(error => console.error(error))).response ?? {server: '', key: 0, ts: 0})
        let response = await fetch(this.groupId ? this.paramsQueryVK.server : 'https://' + this.paramsQueryVK.server, { body: new URLSearchParams({key: this.paramsQueryVK.key, act: 'a_check', wait: 25, ts: this.paramsQueryVK.ts, mode: '2 | 8 | 32 | 64 | 128', version: 3}), method: 'POST'}).catch(() => this.paramsQueryVK.key = '')
        if(response.ok) response = await response.json(); else return []
        return ((response.failed === 2 || response.failed === 3) && ((this.paramsQueryVK.key = '') || [])) || ((this.paramsQueryVK.ts = response.ts) && response.updates)
    }


    /** how to use
    *
    * @param type
    * @param func
    * @returns {void}
    * 
    * `[constant].track('event name', function => {})
    *  VK.track('message_new', newMessage => VK.reply(newMessage, 'Hello!'))`
    */
    track(type, func)
    {
        this.mapCallbacks.push([type, func])
    }


    /** a chat message?
    *
    * @param message
    * @returns {boolean}
    */
    isChat(message)
    {
        return (message.peer_id ?? message.peerId) > 2e9
    }


    /** checking for a reply message
    *
    * @param message
    * @returns {boolean}
    */
    hasReply(message)
    {
        return !!(message.reply_message ?? message.replyMessage)
    }


    /** Switching between event receiving types or turning them off
    *
    * @param longPoll
    * @param callback
    * @returns {longPoll: boolean, callback: boolean}
    */
    setTypeEventReceipt({longPoll, callback: callBack})
    {
        (typeof callBack === 'boolean' && this.startGetingNewEvents.callback !== callBack) && ((this.startGetingNewEvents.callback = callBack) ? this.#start('callback') : serverClose(this.callback.listenSocket));
        (typeof longPoll === 'boolean' && this.startGetingNewEvents.longPoll !== longPoll) && (this.startGetingNewEvents.longPoll = longPoll) && this.#start('longPoll');
        
        !this.startGetingNewEvents.longPoll && !this.startGetingNewEvents.callback && ((this.startGetingNewEvents.longPoll = true) && this.#start('longPoll'))
        return this.startGetingNewEvents
    }


    /** calling methods, example:
    *
    * @param method
    * @param params
    * @returns {*}
    *
    * `[constant].Query('name of the method', {parameter object})
    * VK.Query('messages.send', {random_id: 0, chat_id: 1, message: 'Hello!'})`
    */
    async Query(method, params)
    {
        return await (await fetch('https://api.vk.com/method/' + method, { body: new URLSearchParams({ access_token: this.token, v: '5.131', ...params }), method: 'POST' })).json()
    }


    /** Uploading a message
    *
    * @param message
    * @returns {Promise<{*}>}
    */
    async loadingMessage(message)
    {
        return (await this.Query('messages.getById', {message_ids: [message.id]})).response.items[0]
    }


    /** sending events to your function
    *
    * @param update
    */
    #eventPush(update)
    {
        for(const key of this.mapCallbacks) 
        {
            (key[0] === update.type || !key[0]) && 
                key[1](update.object ? ((update.object.typeEvent = update.type) && update.object) : update)
            this.mapKeys.size >= 150 && this.mapKeys.clear()
        }
    }
}
exports.VK = VK