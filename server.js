/**
 * Created by ericgoodman on 3/26/18.
 */
// Require the packages we will use:
var http = require("http"),
    socketio = require("socket.io"),
    fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile("client.html", function(err, data){
        // This callback runs when the client.html file has been read from the filesystem.
        if(err) return resp.writeHead(500);
        resp.writeHead(200);
        resp.end(data);
    });
});
app.listen(3456);

var rooms = [];
var map = {};

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){

    socket.emit('login', socket.id);

    socket.on('new_server_login', function(data) {
        // Map userIds to usernames
        map.data.userId = data.username;
    });

    socket.on('message_to_server', function(data) {
        var room = data.room;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === room.name) {
                rooms[i].messages.push(data.message);
                var newData = {
                    message: data.message,
                    rooms: rooms,
                    roomName: data.room.name
                };
                io.sockets.emit("message_to_client", newData);
                return
            }
        }
    });

    socket.on('get_rooms_server', function() {
       socket.emit('get_rooms_client', rooms);
    });

    socket.on('enter_room_server', function(data) {
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {
                rooms[i].users.push(data.newUser);
                console.log('Adding user to room', data.newUser, data.roomName);
                var newData = {
                    rooms: rooms,
                    newUser: data.newUser,
                    roomName: data.roomName
                };
                console.log('Entering room', data.roomName);
                io.sockets.emit('enter_room_client', newData);
                return
            }
        }
    });

    socket.on('leave_room_server', function(data) {
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.room.name) {
                rooms[i].users = rooms[i].users.filter(function(user) {
                    return user !== data.exitingUser;
                });
                var newData = {
                    rooms: rooms,
                    exitingUser: data.exitingUser,
                    roomName: data.room.name
                };
                console.log('Sending new Data', newData);
                io.sockets.emit('leave_room_client', newData);
                return
            }
        }
    });

    socket.on('new_room_server', function(room) {
        rooms.push(room);
        console.log('Created room', room.name);
        io.sockets.emit('new_room_client', room);
    });

    socket.on('delete_room', function(room) {
        for(var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === room.name) {
                rooms.remove(i);
                return
            }
        }
    });

    socket.on('diconnect', function() {
        io.sockets.emit('disconnect_client', socket.id);
    });


});