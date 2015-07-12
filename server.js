var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var winston = require('winston');

winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
            timestamp: function(){return new Date()}
        })
    ],
    exitOnError: false
});

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/static/index.html');
});

var allUsers = {};

io.on('connection', function(socket){

	
	console.dir(socket.id);
	
	var userId = socket.handshake.query.userId;
	
	console.log(userId);
	socket.join('user' + userId);
	
	allUsers[userId] = new Date();
	
	//broadcast current user list
	io.emit('userList', allUsers);
    
	socket.on('chat message', function(msg){
		io.emit('chat message', msg);
	});
	
	app.get('/sendMsg', function(req, res){
		var userID = req.query.uid;
		var msg = req.query.msg;
		
		logger.debug("send msg to: " + userID + " , msg: " + msg);
		
		if(userID && userID.length > 0){
			//TODO: check if user exist
			io.to('user' + userID).emit('msg', msg)
		}
		//end request
		res.end();
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});