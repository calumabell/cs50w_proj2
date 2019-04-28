document.addEventListener('DOMContentLoaded', () => {
    // Conntect to websocket
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port)

    // Template for message card
    const template = Handlebars.compile(document.querySelector('#cardTemplate').innerHTML)

    let name = localStorage.getItem('name')
    if (!name) {
        name = prompt("What is your name?")
        localStorage.setItem('name', name)
    }

    // When connected, configure listeners
    socket.on('connect', () => {

        // Load chat history
        socket.emit('get chatLog')


        // Entering a message into the form emits a 'submit message' event
        document.querySelector('#submitMessage').onsubmit = () => {

            const message = document.querySelector('#newMessage').value
            const d = new Date()
            document.querySelector('#newMessage').value = ""
            socket.emit('submit message', {'name': name, 'msg': message, 'timestamp': d.toUTCString()})

            // return false to stop page from reloading
            return false
        }


        // When a new message is received, append it to the DOM
        socket.on('new message', data => {

            // Use message info from data param and render template
            const context = {"name": data.name, "timestamp": data.timestamp, "message": data.msg}
            const card = template(context)
            // Add message to DOM (add new messages to top of list)
            document.getElementById("messages").innerHTML = card + document.getElementById("messages").innerHTML
        })


        // When a new channel is submitted, let the server know
        // Emits 'submit new channel'
        document.querySelector('#add-channel-form').onsubmit = () => {
            const channel = document.querySelector('#new-channel-name').value
            document.querySelector('#new-channel-name').value = ""
            socket.emit('submit new channel', {'channel': channel, 'owner': name})
            return false
        }

        // When 'create channel' is recevied: add a new channel to the sidebar
        socket.on('create channel', data => {
            const channelLink = document.createElement("li")
            channelLink.innerHTML = data.channel
            channelLink.className = 'channel-link'

            // Clicking on a channel
            channelLink.onclick = () => {

                // Change classes to animate the sidebar
                if (channelLink.className === 'channel-link') {
                    const openChannel = document.querySelector('.channel-link-open')
                    if (openChannel) {
                        openChannel.className = 'channel-link'
                    }
                    channelLink.className = 'channel-link-open'
                }

                // Emit a 'change channel message'
                socket.emit('change channel', {'channel': data.channel})
            }

            document.querySelector("#channel-list").appendChild(channelLink)
        })
    })
})
