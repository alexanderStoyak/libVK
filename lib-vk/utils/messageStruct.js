module.exports = 
{
    // Adding a new message.
    4: {
        type: 'messageNew',
        struct: [
            'type',
            'messageId',
            'minorId',
            'peerId',
            'date',
            'text',
        ]
    },
    // Edit the message.
    5: {
        type: 'messageEdit',
        struct: [
            'type',
            'messageId',
            'minorId',
            'peerId',
            'date',
            'text'
        ]
    },
    // Reading all outgoing messages in $peerId that arrived before the message with $localId
    7: {
        type: 'readingAllOutMessages',
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
    // Changing the chat information $peer_id with the type $type_id, $info - additional information about the changes, depends on the type of event.
    52: {
        type: 'changingChatInfo',
        struct: [
            'type',
            'typeEventIsChat',
            'peerId',
        ],
        typeEventIsChat: {
            1: 'newTitleChat',
            2: 'newPhotoChat',
            3: 'newAdminChat',
            4: 'pinnedMessageChat',
            5: 'userJoinedChat',
            6: 'userLeftChat',
            7: 'userExcludedChat',
            9: 'userRemovedAdmin'
        },
        infoType: {
            1: 'info',
            2: 'info',
            3: 'adminId',
            5: 'conversationMessageId',
            6: 'userId',
            7: 'userId',
            8: 'userId',
            9: 'userId'
        }
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
    // Users $userIds record an audio message in the conversation $peerId.
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
