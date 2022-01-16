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


exports.NewMessage = NewMessage;