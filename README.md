# Project 2


This is my implementation of Project 2 for the Web Programming with Python and
JavaScript from course from HarvardX/edx.

https://www.edx.org/course/cs50s-web-programming-with-python-and-javascript

Schwach is a chat room app made with Flask and Socket.IO. After entering a display
name the user can create channels to chat in or join another user's channel by
clicking on it's name in the side bar. This will load messages from server
memory and can add their own using the form at the bottom of the screen. If a
user closes the window their username and current channel are reloaded from local
memory. (No database in this one!)

On top of the project requirements, I included the following additional features.
    - Alerts that appear next to a channel link when new message have been
    received on that channel.
    - Delete buttons that are only available to a messages author.
    - UI animations for add/deleting messages and opening channel links.

Repository Contents

static / css - SASS and compiled CSS stylesheet, includes animations.
static / js / scripts.js - client-side JavaScript code
templates / index.html - HTML index with Handlebars templates
requirements.txt - only Flask and SocketIO, nothing fancy!
