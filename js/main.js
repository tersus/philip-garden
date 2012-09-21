//Emacs On Fire
//
//Liscence: BSD
//
//Emacs-like text editor for the web that runs on top of tersus. It has the ability
//to share files and syncronize updates

function saveText(){
    tersus.writeFile("/Monad.hs",editor.getValue(),function(msg){alert(msg)});
}

function populateTextArea(content){ editor.setValue(content) }

function loadText(){
    tersus.getFile("/Monad.hs",populateTextArea);
}

$(document).ready(loadText);

var users = [];

(function ($, undefined) {
    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);

var carrigePos = 0;

var delta = [];

var BACKSPACE_NUM = 0;

function keyPressHandler(e){

    delta.push(String.fromCharCode(e.which));
}

function sendUpdates(updates){

    if(updates.delta.length > 0)
        document.tersus.sendMessageAsync(users,document.tersus.application,JSON.stringify(updates),function(m){});
}

function receiveUpdates(msg){

    var updates = eval("(" + msg.content + ")");
    var oldText = $('#text').val();
    $('#text').val(applyUpdates(oldText,updates.delta,updates.pos));
}

function deltaCount(d){

    var count = 0;
    for(var i = 0; i < d.length; i++){

	if(d[i] === BACKSPACE_NUM)
	    count = count - 1;
        else
	    count = count + 1;
    }

    if(count < 0)
	count = 0;

    return count;
}

function applyUpdates(oldText,inserts,pos){

    var head = [];
    var tail = "";

    if(pos > carrigePos)
	pos += deltaCount(delta);

    if(oldText.length < pos){
	
	head = oldText.split("");
	
    }else{

	head = oldText.substr(0,pos).split("");
	tail = oldText.substr(pos);
    }

    for(var i = 0; i < inserts.length; i++){
	
	if(inserts[i] === BACKSPACE_NUM){
	    head.pop();
	}
	else{
	    head.push(inserts[i]);
	}

    }

    return head.join("") + tail;
}

function getUpdatesAndReset(){

    var updates = new Object();
    updates.pos = carrigePos;
    updates.delta = delta;
    carrigePos = $('#text').getCursorPosition();
    delta = [];

    return updates;
}

function isArrow(keyCode){
    
    return keyCode == 39 || keyCode == 40 || keyCode == 37 || keyCode == 38;
}

function keyDownHandler(e){

    if(isArrow(e.which)){

	var updates = getUpdatesAndReset();

	sendUpdates(updates);

    }else if(e.which == 8)
	delta.push(BACKSPACE_NUM);
}

function keyUpHandler(e){

    if(isArrow(e.which)){

	carrigePos = $('#text').getCursorPosition();	    
    }
}

function clickHandler(e){
    
    carrigePos = $('#text').getCursorPosition();
}

function shareDocument(){

    if(users.length > 0)
        document.tersus.unregisterCallback(users[0]);

    users = [$("#userIn").val()];

    delta = [];
    document.tersus.registerCallback(users[0],receiveUpdates);

    document.tersus.sendMessageAsync(users,document.tersus.application,$("#text").val(),function(m){});
}



document.tersus.registerDefaultCallback(function(msg){

    if(users.length > 0)
        document.tersus.unregisterCallback(users[0]);

    $('#text').val(msg.content);
    users = [msg.userSender];
    
    document.tersus.registerCallback(msg.userSender,receiveUpdates);
});


document.tersus.initMessaging();
