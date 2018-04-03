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
var privateMessages = [];
var io = socketio.listen(app);

// Array Remove - By John Resig (MIT Licensed) - taken from https://stackoverflow.com/questions/500606/deleting-array-elements-in-javascript-delete-vs-splice
Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

io.sockets.on("connection", function(socket){

    socket.emit('login', socket.id);
/*
    socket.on('new_server_login', function(data) {
        // Map userIds to usernames
        const userId = data.userId;
        map[userId] = data.username;
    });
*/
    socket.on('message_to_server', function(data) {
        var room = data.room;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === room.name) {
                rooms[i].messages.push(data.message);
                //msgLikes = data.likes;

                var newData = {
                    message: data.message,
                    rooms: rooms,
                    roomName: data.room.name,
                };
                io.sockets.emit("message_to_client", newData);
                return
            }
        }
    });
    socket.on('update_likes', function(data){
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.room.name) {
                //Over write old message
                var present = false;
                if(rooms[i].messages.length > 0){
                    for(var j=0; j<rooms[i].messages.length; j++){

                        if(rooms[i].messages[j].messageText == data.msg.messageText && rooms[i].messages[j].sender == data.msg.sender){
                            present = true;
                            rooms[i].messages[j] = data.msg;
                        }
                    }
                }
                if(!present){
                    rooms[i].messages.push(data.msg);
                }
                io.sockets.emit('refresh_likes_client', rooms);
                return
            }
        }
    });
    //Private messages
    socket.on('pm_server', function(data) {
        privateMessages.push(data.pmessage);
        var newData = {
            messages: privateMessages
        };
        io.sockets.emit("pm_client", newData);
        return

    });
    socket.on('update_banned', function(data){
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {
                rooms[i].banned.push(data.user);
                var newData = {
                    bannedUser: data.user,
                    rooms: rooms
                }
                io.sockets.emit('refresh_banned_client', newData);
                return
            }
        }
    });
    socket.on('update_rooms', function(){
        io.sockets.emit('refresh_rooms_client', rooms);
        return
    });

    socket.on('update_kicked', function(data){
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {
                rooms[i].kicked.push(data.user);
                io.sockets.emit('refresh_kicked_client', rooms);
                var newData = {
                    kickedUser: data.user,
                    rooms: rooms
                }
                io.sockets.emit('refresh_kicked_client', rooms);
                return
            }
        }
    });

    socket.on('update_unkicked', function(data){
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {
                var index = rooms[i].kicked.indexOf(data.user);
                rooms[i].kicked.splice(index, 1);
                var newData = {
                    bannedUser: data.user,
                    rooms: rooms
                }
                io.sockets.emit('refresh_rooms_client', rooms);
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
                var duplicate = false;
                for(var j=0; j<rooms[i].users.length; j++){
                    if(rooms[i].users[j] === data.newUser){
                        duplicate = true;
                    }
                }
                if(!duplicate){rooms[i].users.push(data.newUser);}
                var newData = {
                    rooms: rooms,
                    newUser: data.newUser,
                    roomName: data.roomName
                };
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
                io.sockets.emit('leave_room_client', newData);
                return
            }
        }
    });

    socket.on('new_room_server', function(room) {
        rooms.push(room);
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

    socket.on('disconnect', function() {
        const username = map[socket.id];
        for (var i = 0; i < rooms.length; i++) {
            for (var j = 0; j < rooms[i].users.length; j++) {
                // Get the username of the person in that room
                var roomUsername = rooms[i].users[j];
                if (roomUsername === username) {
                    rooms[i].users.remove(j);
                    var newData = {
                        rooms: rooms,
                        exitingUser: username,
                        roomName: rooms[i].name
                    };
                    console.log('Detected disconnect', newData);
                    io.sockets.emit('leave_room_client', newData);
                }
            }
        }
    });


});
