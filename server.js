var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var winston = require('winston');
var mongojs = require('mongojs');
var Q = require("q");

/* setup logger */
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

/* connect to MongoDB */
var db = mongojs('wschat');

var countCol = db.collection('counters');
var userCol = db.collection("users");
var msgCol = db.collection('msg');

countCol.insert(
   {
      _id: "userid",
      seq: 0
   }
);

/* function to generate auto-increment id for userid */

function getNextSequence(name) {
	var d = Q.defer();
	countCol.findAndModify(
		{
			query: { _id: name },
			update: { $inc: { seq: 1 } },
			new: true
		}, 
		function(err, doc, lastErrorObject) {
			if(err){
				d.reject(err);
			}else{
				d.resolve(doc.seq);
			}
		}	
	);
	return d.promise;
}

/* find user by name */

function findUserByName(name) {
	var d = Q.defer();
	userCol.findOne(
		{
			userName: name
		}, 
		function(err, doc) {
			if(err){
				d.reject(err);
			}else if(doc == null){
				d.reject(null);
			}else{
				d.resolve(doc);
			}
		}	
	);
	return d.promise;
}

var allUsers = {};


io.on('connection', function(socket){
	
	var userName = socket.handshake.query.userId;
	
	logger.info("userName: " + userName + " connected to server, socket.id: " + socket.id);
	
	/* register use to the current user list */
	
	findUserByName(userName).then(
		function(val){
			var id = val.userid;
			allUsers[id] = userName;
			socket.join('user' + id);
			//broadcast current user list
			io.emit('userList', allUsers);
		},
		function(err){
			//no such user, create a new one
			getNextSequence("userid").then(function(nextSeq){
				console.log("seq: " + nextSeq);
				allUsers[nextSeq] = userName;
				socket.join('user' + nextSeq);
				//broadcast current user list
				io.emit('userList', allUsers);
				//insert into user collection
				userCol.insert({userid: nextSeq, userName: userName});
			});
		}
	);
	
	/* send message to specific user id */
	socket.on('chatMsg', function(msg){
		var userID = msg.to;
		var from = msg.from;
		var content = msg.content;
		
		logger.debug("send msg from: " + from + " to: " + userID + " , msg: " + content);
		
		msgCol.insert(
			{
				from: from,
				to: userID,
				content: content,
				ts: new Date()
			}
		);
		if(userID && userID.length > 0){
			//TODO: check if user exist
			io.to('user' + userID).emit('msg', msg)
		}
	});
	
	/* when user disconnects */
	socket.on('disconnect', function () {
	
    });
});
/* query message from database */
app.get('/fetchMsg', function(req, res){
	var fromId = req.query.fromid;
	var toId = req.query.toid;
	
	logger.info("fetch msg from: " + fromId + " , to: " + toId);
	
	msgCol.find(
	{
		$or: [{from: fromId, to: toId}, {from: toId, to: fromId}]
	})
	.sort(
		{ts:1},
		function(err, docs){
			//docs is an array
			if(!err){
				res.send(docs);
			}
		}
	);
});

http.listen(3000, function(){
	logger.info('listening on *:3000');
});