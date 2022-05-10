module.exports = 
function readJson(response, callback) {
    let buffer

    response.onData((chunk, isLast) => {
        chunk = Buffer.from(chunk)

        if (isLast) 
        {
            let json
            if (buffer) 
            {
                try {json = JSON.parse(Buffer.concat([buffer, chunk]))}
                catch (error) {return response.close()}

                return callback(json)
            }
            else
            {
                try {json = JSON.parse(chunk)} 
                catch (error) {return response.close()}
                
                return callback(json)
            }
        }
        else
        {
            if (buffer) buffer = Buffer.concat([buffer, chunk])
            else buffer = Buffer.concat([chunk])
        }
    })
    response.onAborted()
}