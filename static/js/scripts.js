document.addEventListener('DOMContentLoaded', () => {
    // Conntect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port)

    // When connected, configure listeners
    socket.on('connect', () => {

        // Entering a message into the form emits a 'submit message' event
        document.querySelector('#submitMessage').onsubmit = () => {

            const message = document.querySelector('#newMessage').value
            document.querySelector('#newMessage').value = ""
            socket.emit('submit message', {'msg': message})

            // return false to stop page from reloading
            return false
        }

        // When a new message is received, append it to the DOM
        socket.on('new message', data => {
            const li = document.createElement('li')
            li.innerHTML = data.msg
            document.querySelector("#messages").append(li)
        })
    })

})
