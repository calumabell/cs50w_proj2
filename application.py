import os

from flask import Flask, render_template, request, url_for
from flask_socketio import SocketIO, emit

# Initialise Flask and SocketIO
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Declare server-side memory
chatLog = []
logSize = 10

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on('submit message')
def msg(data):
    # Add message to the front of the chat history list
    chatLog.insert(0, data)
    if len(chatLog) >= logSize:
        chatLog.pop(logSize)
    emit('new message', data, broadcast=True)

@socketio.on('get chatLog')
def getHistory():

    # Iterate through history backwards so that newest messages are top
    for i in range(len(chatLog), 0, -1):
        emit('new message', chatLog[i-1])


if __name__ == '__main__':
    socketio.run(app, debug=True)
