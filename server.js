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

var privateMessages = [];
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){

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
    //Private messages
    socket.on('pm_server', function(data) {
       // for (var i = 0; i < privateMessages.length; i++) {
            //if (privateMessages[i].name === room.name) {
                privateMessages.push(data.pmessage);
                var newData = {
                    messages: privateMessages
                };
                io.sockets.emit("pm_client", newData);
                return
           // }
        //}
    });
    socket.on('update_banned', function(data){
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {

                console.log('Banning User From Room', data.username, data.roomName);
                rooms[i].banned.push(data.user);
                io.sockets.emit('refresh_rooms_client', rooms);
                return
            }
        }
    });
    socket.on('update_kicked', function(data){
        console.log("Updating kicked");
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {

                console.log('Kicking User From Room', data.username, data.roomName);
                rooms[i].kicked.push(data.user);
                io.sockets.emit('refresh_rooms_client', rooms);
                return
            }
        }
    });
    socket.on('update_unkicked', function(data){
        console.log("Updating kicked");
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].name === data.roomName) {

                console.log('Unkicking User From Room', data.username, data.roomName);
                var index = rooms[i].kicked.indexOf(data.user);
                rooms[i].kicked.splice(index, 1);
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
                    roomName: data.roomName
                };
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


});