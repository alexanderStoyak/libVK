module.exports = 
{
    4: {
        // Adding a new message.
        type: 'messageNew',
        struct: [
            'type',
            'id',
            'conversation_message_id',
            'peer_id',
            'date',
            'text'
        ]
    },
    5: {
        // Edit the message.
        type: 'messageEdit',
        struct: [
            'type',
            'id',
            'conversation_message_id',
            'peer_id',
            'date',
            'text'
        ]
    },
    7: {
        // Reading all outgoing messages in $peerId that arrived before the message with $localId
        type: 'ReadingAllOutMessages',
        struct: [
            'type',
            'peerId',
            'localId',

        ]
    },
    /** A friend of $userId has become online. The extra contains the platform ID.
    *    $timestamp — the time of the last action of the user $userId on the site.
    */
    8: {
        type: 'userOnline',
        struct: [
            'type',
            'userId',
            'extra',
            'timestamp'
        ]
    },
    /** Friend $userId has become offline ($flags is 0 if the user has left the site and 1 if offline by timeout )
    *    $timestamp — the time of the last action of the user $userId on the site.
    */
    9: {
        type: 'userOffline',
        struct: [
            'type',
            'userId',
            'flags',
            'timestamp'
        ]
    },
    /** The user $userId is typing text in the dialog.
    *    The event comes once every ~5 seconds when typing. $flags = 1. 
    */
    61: {
        type: 'messageTyping',
        struct: [
            'type',
            'userId',
            'flags'
    
        ]
    },
    /** The user $userId types text in the conversation $chatId. 
    */
    62: {
        type: 'messageTypingIsChat',
        struct: [
            'type',
            'userId',
            'chatId' 
        ]
    },
    /** Users $userIds type text in the conversation $peerId.
    *   A maximum of five conversation participants are transmitted, the total number of printers is indicated in $totalCount.
    *   $ts is the time when this event was generated.
    */
    63: {
        type: 'messageTypingsIsChat',
        struct: [
            'type',
            'userIds',
            'peerId',
            'totalCount',
            'ts'
        ]
    },
    /** Users $userIds record an audio message in the conversation $peerId.
    */
    64: {
        type: 'recordsAudiomessage',
        struct: [
            'type',
            'userIds',
            'peerId',
            'totalCount',
            'ts'
        ]
    }
}