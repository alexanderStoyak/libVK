const structsMessage = require('./utils/messageStruct');
const unescapeHTML = text => text.replace(/&lt;|&gt;|<br>|&amp;|&quot;/g, word => {return {'&lt;': '<','&gt;': '>','<br>': '\n','&amp;': '&','&quot;': '"'}[word] || word})



module.exports = 
class Message
{
    constructor (message) 
    {
        const typeMessage = structsMessage[message[0]] ? structsMessage[message[0]].type : '';
        const structMessage = structsMessage[message[0]];

        if(typeMessage) structMessage.struct.forEach((key, index) => this[key] = message[index]); else return this.type = null;

        if(typeMessage === 'messageNew' || typeMessage === 'messageEdit') 
        {
            this.text = this.text ? unescapeHTML(this.text) : this.text;
            this.isChat = this.peerId > 2e9;
            if(this.isChat) this.chatId = this.peerId - 2e9

            message[6] && ((this.senderId = message[6].from ?? null) ?? (this.senderId = this.peerId));

            if(message[6] && message[6].source_act)
            {
                this.event = {
                    eventType: message[6].source_act,
                    eventUserId: message[6].source_mid
                }

                message[6].source_message && (this.event.text = unescapeHTML(message[6].source_message));
                message[6].source_chat_local_id && (this.event.conversationMessageId = message[6].source_chat_local_id);
                message[6].source_text && (this.event.text = unescapeHTML(message[6].source_text));
                message[6].source_old_text && (this.event.oldText = unescapeHTML(message[6].source_old_text));

            }

            this.addition = message[7];
            this.senderId = +this.senderId;
        }
        else if (typeMessage === 'userOnline' || typeMessage === 'userOffline') this.userId = -this.userId;
        else if(typeMessage === 'changingChatInfo') 
        {
            this.typeEventIsChat = structMessage.typeEventIsChat[this.typeEventIsChat];
            this[structMessage.infoType[message[1]]] = message[3];

        }


        this.type = typeMessage;
    }
}