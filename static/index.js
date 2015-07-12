(function(){

	var socket;
	var myID;


	function connectToChat(id){
		var socket=io.connect('http://localhost:3000', {
			query: 'userId=' + id
		});	
	
		myID = id;
	
		socket.on('userList', function(msg){
			console.log(msg);
			var users = Object.keys(msg);
			var listHTML = "";
			//<li><a class="list-group-item" href="#">User2</a></li>
			for(var i = 0; i < users.length; i++){
				var curUser = users[i];
				if(curUser != id){
					listHTML += '<li username="' + curUser + '"><a class="list-group-item" href="#">' + curUser + '</a></li>';
				}
			}
			$('#userList').empty();
			$('#userList').append(listHTML);
		});
	
		socket.on('msg', function(msg){
			console.log(msg);
			showIncomingMsg(msg);
		});
	}

	function showIncomingMsg(msg){
		if(!msg.from){
			return;
		}
		var fromID = msg.from;
	
		if($('#contact_' + fromID).length == 0){
			openChatTab(fromID);
		}
	
		var text = msg.content;
	
		if(text.length > 0){
			$('#messages_' + fromID).append($('<li>').text(fromID + ": " + text));
		}
	}

	function openChatTab(toUserID){
		//var id = $(".nav-tabs").children().length; //think about it ;)
		var id = toUserID;
	
		if($('#contact_' + id).length > 0){
			return;
		}
	
		$(".nav-tabs").append('<li><a href="#contact_'+id+'">' + id + '</a><span>x</span></li>');
		$('.tab-content').append('<div class="tab-pane" id="contact_'+id+'">' + '<ul id="messages_' + id + '"></ul><input autocomplete="off" /><button username=' + id + '>Send</button>' + '</div>');
		$(".nav-tabs li").children('a').last().click();
	}

	$(document).ready(function(){
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

		$("#userList").on("click", "li", function(e){
			e.preventDefault();
			var toID = $(this).attr("username");
			console.log(toID);
			openChatTab(toID);
		});

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
	
		$(".tab-content")
		.on("click", "div button", function(){
		
			var toID = $(this).attr("username");
		
			console.log(toID);
		
			var msg = $(this).siblings('input').val();
		
			console.log(msg);
		
			$(this).siblings('input').val('');
		
			$(this).siblings('ul').append($('<li>').text("me: " + msg));
		
			$.get( "/sendMsg", { uid: toID, msg: {from: myID, content: msg } });
		
		});
	});

})();