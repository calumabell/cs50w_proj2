document.addEventListener('DOMContentLoaded', () => {
    // Conntect to websocket
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port)

    // Template for message card
    const messageTemplate = Handlebars.compile(document.querySelector('#msgTemplate').innerHTML)

    // Template for channel link
    const channelTemplate = Handlebars.compile(document.querySelector('#channelLinkTemplate').innerHTML)

    // When connected, configure listeners
    socket.on('connect', () => {

        // Load id from localStorage. If there isn't one, get it from the server
        let id = localStorage.getItem('id')
        if (!id) {
            socket.emit('get id count')
        }



        // Load username from localStorage. If there isn't one, get one
        let name = localStorage.getItem('name')
        if (!name) {
            name = prompt("What is your name?")
            localStorage.setItem('name', name)
        }

        // Add user's name to top right of page
        document.getElementById('username-header').innerHTML = name

        // if a channel is stored in local memory, open it
        if (localStorage.getItem('channel')) {
            socket.emit('open channel', {'channel': localStorage.getItem('channel')})
        }

        // else, create a welcome message
        else {
            const welcomeTemp = Handlebars.compile(document.querySelector('#welcomeMessageTemplate').innerHTML)
            document.getElementById('messages').innerHTML = welcomeTemp()
        }

        // Once connected, load the channel list from server side memeory
        socket.emit('load channel list')

        socket.on('msg id from server', data => {
            id = data.id
        })

        // *** NEW MESSAGE FORM SUBMITTED ***
        // When a new msg is submitted, run some checks and then send it (with
        // relavent data) to server

        document.querySelector('#submitMessage').onsubmit = () => {

            // Get current channel
            const channel = localStorage.getItem('channel')
            // if not in a channel, return
            if (!channel) {
                return false
            }

            // Get message contents from form and clear form
            const message = document.querySelector('#newMessage').value
            document.querySelector('#newMessage').value = ""

            // if message is empty, don't bother and return
            if (message.length == 0) {
                return false
            }

            const d = new Date()

            socket.emit('submit message', {'name': name, 'msg': message, 'channel': channel, 'timestamp': d.toUTCString()})

            // return false to stop page from reloading
            return false
        }

        // *** NEW MESSAGE RECEIVED ***
        // When a new message is received, append it to the DOM if you are in
        // the correct channel. Else and an alert to the channel list

        socket.on('new message', data => {
            // If the message is on a different channel, alert user
            if (!(data.channel == localStorage.getItem('channel')))
                updateMessageAlert(data.channel, "increment")

            // If the message is on the current channel, append it to DOM
            else {
                // Check if message was sent my current user
                const isUser = (data.name == localStorage.getItem("name"))

                // Use message info from data param and render template
                const context = {"id": data.id, "name": data.name, "isUser": isUser, "timestamp": data.timestamp, "channel": data.channel, "message": data.msg}

                // From HTML string, create a DOM element
                const doc = new DOMParser().parseFromString(messageTemplate(context), 'text/html')
                const card = doc.body.firstChild

                // Don't animate message if loaded from memory
                if (data.fromMem) {
                    card.style.animationPlayState = "paused"
                }
                else {
                    card.style.animationDirection = "reverse"
                    card.style.animationPlayState = "running"
                }
                // Add message to DOM (add new messages to top of list)
                const messenger = document.getElementById("messages")
                messenger.insertBefore(card, messenger.firstChild)

                // Update id in local localStorage
                localStorage.setItem("id", data.id)

                // If this message was sent by the current user, add listeners
                // to template buttons
                if (data.name == localStorage.getItem("name")) {

                    // Get delete button for message with a given ID
                    const delButton = document.getElementById(`del-${data.id}`)

                    // Delete message if the button is clicked
                    delButton.onclick = () => {
                        // Remove message from memeory
                        socket.emit('delete message', data)
                    }
                }

            }
        })

        // *** REMOVE A MESSAGE FROM THE DOM ***
        // When the 'rmfD' is received trigger delete animation and rmv from DOM

        socket.on('remove message from DOM', data => {
            // Make sure user is in the correct channel before animating
            if (data.channel == localStorage.getItem("channel")) {
                // A bit of a hack -> cloning  msg node to reset CSS animation
                const msgToDelete = document.getElementById(data.id)
                const msgCopy = msgToDelete.cloneNode(true)
                msgCopy.style.animationDirection = "normal"
                msgCopy.style.animationPlayState = "running"
                msgToDelete.parentNode.replaceChild(msgCopy, msgToDelete)

                msgToDelete.addEventListener('animationend', () => {
                    msgCopy.parentNode.removeChild(msgCopy)
                })
            }

        })

        // *** CREATE CHANNEL FORM SUBMITTED ***
        // When this form is submitted, sanitise and emit a 'submit new channel'
        // message to the server.

        document.querySelector('#add-channel-form').onsubmit = () => {
            const channel = sanitiseChannel(document.querySelector('#new-channel-name').value)
            // if channel name is valid AND channel doesn't already exist
            if (channel && !(document.getElementById(`channel-${channel}`))) {
                socket.emit('submit new channel', {"channel": channel, "owner": name})
            }
            document.querySelector('#new-channel-name').value = ""
            return false
        }


        // *** CREATE CHANNEL / CHANNEL CHANGER ***
        // When a 'create channel' message is received from the server, append
        // it to DOM. Attach listener to handle changing channels on click.

        socket.on('create channel', data => {
            const channel = data.channel

            // Create a channel link from handlebars template
            const context = {"channel": channel}
            const channelLink = new DOMParser().parseFromString(channelTemplate(context), 'text/html').body.firstChild

            // Indent the link of the previous channel stored in memory
            // (this will only happen via the 'load channel list' event)
            if (channel == localStorage.getItem("channel")) {
                channelLink.className = 'channel-link-open'
                document.getElementById('channel-header').innerHTML = channel

            }
            // Clicking on a link changes it class/style and emits
            channelLink.onclick = () => {
                // Check that a closed channel link was clicked
                if (channelLink.className == 'channel-link') {

                    // Close previous channel + open new channel
                    const openChannel = document.querySelector('.channel-link-open')
                    if (openChannel) {
                        openChannel.className = 'channel-link'
                    }
                    channelLink.className = 'channel-link-open'

                    // Store channel name in local storage
                    localStorage.setItem('channel', channel)

                    // Clear messages from previous channel
                    const messages = document.getElementById("messages")
                    while (messages.firstChild) {
                        messages.removeChild(messages.firstChild)
                    }

                    // Reset received message alerts
                    updateMessageAlert(channel, "reset")

                    // Change channel header
                    document.getElementById('channel-header').innerHTML = channel

                    // Emit a 'change channel message'
                    socket.emit('open channel', {'channel': channel})
                }
            }

            // Append channel link to DOM
            document.querySelector("#channel-list").appendChild(channelLink)
        })
    })
})

// *** sanitiseChannel(str) ***
// takes a channel name as an argument and returns a santised version of it

function sanitiseChannel(str) {
    // Check that string length is valid
    if (!str)
        return false

    if (str.length == 0 || str.length > 14)
        return false

    let string = str.toLowerCase()
    while (string.includes(" "))
        string = string.replace(" ", "-")
    while (string.includes("_"))
        string = string.replace("_", "-")
    return string
}

// *** messageAlert(channel, mode) ***
// Manipulates the msg alerts of a give channel link badge

function updateMessageAlert(channel, mode) {
    const badge = document.getElementById(`${channel}-msg-alert`)
    if (mode == "increment")
        badge.innerHTML = Number(badge.innerHTML) + 1
    else if (mode == "reset")
        badge.innerHTML = ""
    else if (mode = "decrement") {
        if (Number(badge.innerHTML) > 0)
            badge.innerHTML = Number(badge.innerHTML) - 1
    }
}
