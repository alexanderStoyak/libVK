const structMessage = require('./utils/messageStruct');

module.exports = 
class Message
{
    constructor (message) 
    {
        const typeMessage = structMessage[message[0]] ? structMessage[message[0]].type : '';
        if(typeMessage === 'messageNew' || typeMessage === 'messageEdit') 
        {
            structMessage[message[0]].struct.forEach((key, index) => this[key] = message[index])
            this.text = this.text ? this.text.replace(/<br>/g, '\n') : this.text;
            (!this.peer_id > 2e9) && (this.conversation_message_id = 0)
        }
        else if (typeMessage === 'userOnline' || typeMessage === 'userOffline') 
        {
            structMessage[message[0]].struct.forEach((key, index) => this[key] = message[index]);
            this.userId = this.userId * -1;
        }
        else if(typeMessage)
        {
            structMessage[message[0]].struct.forEach((key, index) => this[key] = message[index]);
        }


        this.type = typeMessage;
    }
}