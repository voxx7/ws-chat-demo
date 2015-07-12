(function(){

	var socket;
	var myID;
	var myUID;
	var userList;

	/* handle login */
	function connectToChat(id){
		socket=io.connect(location.origin, {
			query: 'userId=' + id
		});	
	
		myID = id;
		
		/* handle server update user list */
		socket.on('userList', function(msg){
			console.log(msg);
			userList = msg;
			
			var users = Object.keys(msg);
			var listHTML = "";
			//<li><a class="list-group-item" href="#">User2</a></li>
			for(var i = 0; i < users.length; i++){
				var curUID = users[i];
				var curUserName = msg[curUID];
				if(curUserName != id){
					listHTML += '<li userid="' + curUID + '" username="' + curUserName + '"><a class="list-group-item" href="#">' + curUserName + '</a></li>';
				}else{
					myUID = curUID;
				}
			}
			$('#userList').empty();
			$('#userList').append(listHTML);
		});
		/* handle incoming message */
		socket.on('msg', function(msg){
			console.log(msg);
			showIncomingMsg(msg);
		});
	}
	
	function getUserNamebyUID(uid){
		return userList[uid];
	}
	
	/* handle incoming message */
	function showIncomingMsg(msg){
		if(!msg.from){
			return;
		}
		var fromID = msg.from;
		var fromName = getUserNamebyUID(fromID);
		/* open new tab if not exist */
		if($('#contact_' + fromID).length == 0){
			openChatTab(fromID, fromName, msg);
		}else{
			var text = msg.content;
			/* append new message */
			if(text.length > 0){
				$('#messages_' + fromID).append($('<li>').text(fromName + " (" + new Date() + "): " + text));
			}
		}
	}

	function openChatTab(toUserID, toUserName, newMsg){
	
		var id = toUserID;
		
		if($('#contact_' + id).length > 0){
			return;
		}
		
		/* create new tab */
		$(".nav-tabs").append('<li><a href="#contact_'+id+'">' + toUserName + '</a><span>x</span></li>');
		$('.tab-content').append('<div class="tab-pane" id="contact_'+id+'">' + '<ul id="messages_' + id + '"></ul><input autocomplete="off" /><button username=' + id + '>Send</button>' + '</div>');
		$(".nav-tabs li").children('a').last().click();
		
		//load message history
		$.getJSON( "/fetchMsg", { fromid: myUID, toid: id}, function(hist){
			console.log(hist);
			if(hist.length > 0){
				for(var i = 0; i < hist.length; i++){
					var curMsg = hist[i];
					
					var msgFromID = curMsg.from;
					
					var msgFromName = getUserNamebyUID(msgFromID);
					
					if(msgFromName == myID){
						msgFromName = "me";
					}
					
					$('#messages_' + id).append($('<li>').text(msgFromName + " (" + new Date(curMsg.ts) + "): " + curMsg.content));
				}
			}
			/*
			if(newMsg){
				var text = newMsg.content;
				var msgFromID = newMsg.from;
				var msgFromName = getUserNamebyUID(msgFromID);
				if(text.length > 0){
					$('#messages_' + id).append($('<li>').text(msgFromName + " (" + new Date() + "): " + text));
				}
			}*/
		});
		
		
		
	}

	$(document).ready(function(){
	
		/* regiester login action */
		$("#loginBtn").click(function(){
			var userName = $("#usernameInput").val();
	
			if(userName && userName.length > 0){
				console.log(userName);
				connectToChat(userName);
				$("#myModalNorm").modal('hide');
				$("#loginNavBtn").html(userName);
				$("#loginNavBtn").removeAttr("data-toggle");
			}		
		});

		/* regiester user list action */
		$("#userList").on("click", "li", function(e){
			e.preventDefault();
			var toID = $(this).attr("userid");
			var toName = $(this).attr("username");
			console.log(toID);
			if(toID){
				openChatTab(toID, toName);
			}
		});
		
		/* regiester nav table close and focus action */
		$(".nav-tabs")
		.on("click", "a", function(e){
			e.preventDefault();
			$(this).tab('show');
		})
		.on("click", "span", function () {
			console.log("fired");
			var anchor = $(this).siblings('a');
			$(anchor.attr('href')).remove();
			$(this).parent().remove();
			$(".nav-tabs li").children('a').first().click();
		});
		
		/* regiester send message action */
		$(".tab-content")
		.on("click", "div button", function(){
		
			var toID = $(this).attr("username");
			console.log(toID);
		
			var msg = $(this).siblings('input').val();
			console.log(msg);
		
			$(this).siblings('input').val('');
			$(this).siblings('ul').append($('<li>').text("me (" + new Date() + "): " + msg));
		
			socket.emit("chatMsg", { to: toID, from: myUID, content: msg});
		
		});
	});

})();