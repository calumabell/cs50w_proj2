document.addEventListener('DOMContentLoaded', () => {
    // Conntect to websocket
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port)

    // Template for message card
    const messageTemplate = Handlebars.compile(document.querySelector('#cardTemplate').innerHTML)

    // Load id from localStorage. If there isn't one, start it from zero again
    let id = localStorage.getItem('id')
    if (!id) {
        id = 0
        localStorage.setItem('id', id)
    }

    // Load username from localStorage. If there isn't one, get one
    let name = localStorage.getItem('name')
    if (!name) {
        name = prompt("What is your name?")
        localStorage.setItem('name', name)
    }

    // When connected, configure listeners
    socket.on('connect', () => {

        // Once connected, load the channel list from server side memeory
        socket.emit('load channel list')

        // if a channel is stored in local memory, open it
        if (localStorage.getItem('channel')) {
            socket.emit('open channel', {'channel': localStorage.getItem('channel')})
        }

        // Entering a message into the form emits a 'submit message' event
        document.querySelector('#submitMessage').onsubmit = () => {

            // Get current channel
            const channel = document.querySelector('.channel-link-open').innerHTML

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

            socket.emit('submit message', {'id': ++id, 'name': name, 'msg': message, 'channel': channel, 'timestamp': d.toUTCString()})

            // return false to stop page from reloading
            return false
        }


        // When a new message is received, append it to the DOM
        socket.on('new message', data => {

            // Make sure that the user is in the correct channel
            if (data.channel == localStorage.getItem('channel')) {

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

        // When the remove message button is clicked, remove message from DOM
        socket.on('remove message from DOM', data => {
            // A bit of a hack -> cloning  msg node to reset CSS animation
            const msgToDelete = document.getElementById(data.id)
            const msgCopy = msgToDelete.cloneNode(true)
            msgCopy.style.animationDirection = "normal"
            msgCopy.style.animationPlayState = "running"
            msgToDelete.parentNode.replaceChild(msgCopy, msgToDelete)

            msgToDelete.addEventListener('animationend', () => {
                msgCopy.remove()
            })
        })


        // When a new channel is submitted, let the server know
        // Emits 'submit new channel'
        document.querySelector('#add-channel-form').onsubmit = () => {
            const channel = sanitiseChannel(document.querySelector('#new-channel-name').value)
            socket.emit('submit new channel', {"channel": channel, "owner": name})
            document.querySelector('#new-channel-name').value = ""
            return false
        }

        // When 'create channel' is recevied: add a new channel to the sidebar
        socket.on('create channel', data => {
            // Create new HTML element using data
            const channel = sanitiseChannel(data.channel)
            if (!channel) {
                return
            }
            const channelLink = document.createElement("li")
            channelLink.innerHTML = channel
            channelLink.className = 'channel-link'

            // Indent the link of the previous channel stored in memory
            // (this will only happen via the 'load channel list' event)
            if (data.channel == localStorage.getItem("channel")) {
                channelLink.className = 'channel-link-open'
                document.getElementById('channel-header').innerHTML = channel

            }

            // Clicking on a link changes it class/style and emits
            channelLink.onclick = () => {
                // Check that a closed channel link was clicked
                if (channelLink.className == 'channel-link') {

                    // Close previous channel
                    const openChannel = document.querySelector('.channel-link-open')
                    if (openChannel) {
                        openChannel.className = 'channel-link'
                    }

                    // Update link class, this will trigger the animation
                    channelLink.className = 'channel-link-open'

                    // Store channel name in local storage
                    localStorage.setItem('channel', channel)

                    // Clear messages from previous channel
                    const messages = document.getElementById("messages")
                    while (messages.firstChild) {
                        messages.removeChild(messages.firstChild)
                    }

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

// sanitiseChannel(str): takes a string as an argument and returns a santised
// lc string if between 1-14 chars if possible. else returns false
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
