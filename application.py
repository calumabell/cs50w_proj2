import os
import sys

from flask import Flask, render_template, request, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

# Initialise Flask and SocketIO
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

channels = {}
maxMsgPerCh = 10


@app.route("/")
def index():
    return render_template("index.html")

""" loadChannelList: on a 'load channel list' event, creates a new channel link
for each channel stored in server memeory. This happens as soon as SocketIO is
connected to reload channels made in other windows.
"""

@socketio.on('load channel list')
def loadChannelList():
    for channel in channels:
        emit('create channel', {"channel": channel})

""" newChannel: on a 'submit new channel' event add a  key to the channels dict.
This key will hold the channel name as a string and an empty list for messages.
"""

@socketio.on('submit new channel')
def newChannel(data):
    channels[data["channel"]] = {"name": data["channel"], "msgs": []}
    emit('create channel', data, broadcast=True)

@socketio.on('submit message')
def msg(data):
    channel = data["channel"]
    # add message to the front of the list at channel names dict key
    channels[channel]["msgs"].insert(0, data)

    # if no. messages exceeds max. remove the oldest msg
    if len(channels[channel]["msgs"]) >= maxMsgPerCh:
        channels[channel]["msgs"].pop(maxMsgPerCh)

    # broadcast message to all users
    emit('new message', data, broadcast=True)



@socketio.on('open channel')
def openChannel(data):
    channelName = data["channel"]
    # Make sure that channel exists in memory
    if channelName in channels:
        channel = channels[channelName]["msgs"]

        # Iterate through history backwards so that newest messages are top
        for i in range(len(channel), 0, -1):
            # for each message in channel, emit a 'new message'
            emit('new message', channel[i-1])


if __name__ == '__main__':
    socketio.run(app, debug=True)
