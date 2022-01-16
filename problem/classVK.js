const axios = require('axios').default;
const callback = require('express')();
const bodyParser = require('body-parser');
const httpAgent = new (require('http')).Agent({ keepAlive: true });
const NewMessage = require('./classNewMessage').NewMessage;


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


exports.VK = VK;