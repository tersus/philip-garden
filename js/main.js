/*
Copyright (c) 2012, Tersus
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the Tersus nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL TERSUS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

----------------------------------------------------------------------------

Philip Garden

Liscence: BSD

Emacs-like text editor for the web that runs on top of tersus. It has the ability
to share files and syncronize updates

*/

/*function saveText(){
    tersus.writeFile("/Monad.hs",editor.editor.getValue(),function(msg){alert(msg)});
}*/

function populateTextArea(content){ editor.editor.setValue(content); }

function loadText(){
    tersus.getFile("/Monad.hs",populateTextArea);
}

//$(document).ready(loadText);

//Array containing all the buffers
var buffers = [];

//Array containing all the Frames, they are indexed
//by the id of the div element of the ace editor
var editors = [];

//Represents a text buffer. The text in a buffer can be 
//asociated with a file.
function Buffer(name,file){

    //Name of the buffer (should be unique)
    this.name = getBufferName(name,buffers,0);
    //File from the buffer (can be undifined for no file)
    this.file = file;
    //The current content of the buffer
    this.content = "";
    //Used to create deltas when using differential synchronization
    this.shadow = [];
}

//Produce a new name for a buffer, this function ensures
//that the produced name dosen't exist within the existing
//buffers
function getBufferName(name,buffers,it){

    var tmpName = "";

    if(it < 1){

	tmpName = name;
    }else
	tmpName = name + " <"+it+">";

    for(var i=0;i<buffers.length;i++){

	if(buffers[i].name == tmpName){

	    return getBufferName(name,buffers,it+1);
	}
    }

    return tmpName;
}

//The main text editor
var editor = undefined;

//The small text editor used to run commands
var miniBuffer = undefined;

//Place to write messages
var nArea = undefined;

//Given a complete filename with path, extract the filename
function makeBufferNameFromFile(filename){

    var lastSlash = filename.lastIndexOf('/');

    if(lastSlash >= 0)
	return filename.substr(lastSlash+1);
    else
	return filename;
}

//Create a new buffer with the given file and content
function openBuffer(editor,filename,content){

    var buffName = makeBufferNameFromFile(filename);

    var buffer = new Buffer(buffName,filename);

    if(content)
	buffer.content = content;

    buffers.push(buffer);
    editor.setBuffer(buffer);

    nArea.html('Loaded file: '+filename);
    editor.editor.focus();
}

//Search in the buffer stack for a buffer
//that the given property is set to the
//given value
function getBufferByProperty(prop,value){

    for(var i=0;i<buffers.length;i++)
	if(buffers[i][prop] == value)
	    return buffers[i];

    return undefined;
}

//Get the buffer from the stack where
//the given file is currently being
//edited
function getBufferByFilename(filename){

    return getBufferByProperty('file',filename);    
}

//Search for a buffer using the name of the buffer
function getBufferByName(name){

    return getBufferByProperty('name',name);
}

//Escape a string to be used as a regular expression
//for searching
RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//Given a buffer, it returns the editor where
//that buffer is being edited if there is 
//such editor, otherwise returns undefined
function getEditorForBuffer(buffer){

    if(editor.buffer.name == buffer.name)
	return editor;

    return undefined;
}


//Search for buffers that have a name similar to
//the given name
function getBuffersLike(name){

    var eName = RegExp.escape(name);

    var ret = [];
    for(var i = 0;i<buffers.length;i++)
	if(buffers[i].name.search(eName) == 0)
	    ret.push(buffers[i]);

    return ret;
}

//Create a new empty buffer with the given name
//and push it to the buffer stack
function createBuffer(name){

    var buffer = new Buffer(name,undefined);
    buffers.push(buffer);
    return buffer;
}

//Navigation functions
function navUp(editor){

    editor.editor.navigateUp();
}

function navDown(editor){

    editor.editor.navigateDown();
}

function navLeft(editor){
    
    editor.editor.navigateLeft();
}

function navRight(editor){

    editor.editor.navigateRight();
}

//Request a buffer name through the minibuffer
//and set that buffer in the current editor
function setBuffer(editor){

    miniBuffer.getInput({
	closeFunction:function(bufferName){
	    
	    var buffer = getBufferByName(bufferName);

	    if(!buffer)
		buffer = createBuffer(bufferName);

	    editor.setBuffer(buffer);
	    editor.editor.focus();
	},
	completionFunction:function(resObj){
	    
	    var suggestions = getBuffersLike(resObj.value);

	    var ret = new Object();

	    if(suggestions.length == 1){
	    	ret.result = suggestions[0].name;
	    }else
	    	ret.result=resObj.value;

	    ret.completions = "";

	    for(var i=0;i<suggestions.length;i++)
	    	ret.completions = ret.completions + suggestions[i].name + "\n";


	    resObj.setValue(ret.result);
	    resObj.setCompletions(ret.completions);	    
	}
    });
}

//Load the specified file into the specified editor
function loadFile(editor,filename){
    console.log("Loading file " + filename);

    tersus.getFile(filename
		   ,function(file_contents){openBuffer(editor,filename,file_contents);}
		   ,{'InexistentFile' : function(e){openBuffer(editor,filename,"");}});
}

//Open a file and load it into a new buffer. This function uses
//the minibuffer to get the filename from the user and puts
//the contents of the file in the given editor.
function openFile(editor){

    miniBuffer.getInput({
	//This function loads the given filename into a buffer, the 
	//filename will be whatever the user has written in the
	//minibuffer.
	closeFunction:function(filename){

	    var buffer = getBufferByFilename(filename);

	    if(buffer)
		editor.setBuffer(buffer);
	    else
		loadFile(editor,filename);

	    editor.editor.focus();
	},
	//This function generates the auto-complete suggestions for filename
	//It will load all files inside the folder to which the text of the 
	//minibuffer refers.
	completionFunction:function(resObj){

	    var lSlash = resObj.value.lastIndexOf("/");
	    var folder = resObj.value.substr(0,lSlash+1);
	    var fName = resObj.value.substr(lSlash+1);

	    //Loading of file names is done asynchronously, so this function
	    //is called once the filenames are loaded to populate the 
	    //text areas with autocomplete suggestions.
	    var doCompletion = prelude.curry(function(resObj,fName,folder,files){

		if(!(files && files.length))
		    return;

		var completions = "";
		var matches = prelude.filter(prelude.curry(function(fname,elem){

		    if(elem.name.search(fname) == 0)
			return true;
		    else
			return false;

		})(fName),files);

		for(var i =0;i < matches.length;i++){
		    completions = completions + matches[i].name + "\n";
		}

		if(matches.length == 1){
		    resObj.setValue(folder + matches[0].name);
		    resObj.setCompletions(undefined);
		}else
		    resObj.setCompletions(completions);

	    })(resObj)(fName)(folder);
	    
	    document.tersus.getFile(folder,doCompletion);
	    
	}

});
}

//Write the contents of the given editor into the file pointed by it's
//buffer
function saveEditorFile(editor){
    editor.buffer.content = editor.editor.getValue();
    
    tersus.writeFile(editor.buffer.file,
		     editor.buffer.content,
		     function(msg){
			 nArea.html('Wrote file: '+editor.buffer.file);
			 editor.editor.focus();
			 });
}

//Try to save file, this function checks that the buffer
//has a file asociated with it. If not, the filename is requested
//through the mini-buffer
function saveFile(editor){
    if(!editor.buffer.file){
	    var createFileFun = prelude.curry(function(editor,filename){
	        editor.buffer.file = filename;
	        saveEditorFile(editor);
	    })(editor);

	    miniBuffer.getInput({closeFunction: createFileFun});
    } else
	    saveEditorFile(editor);
	
}

//Share a buffer with a user
function shareBuffer(editor){

    miniBuffer.getInput({closeFunction : function(user){
	Sync.shareBuffer(editor.buffer,user);
    }});
}

//Some emacs like shortcuts for the editor

//File opening key bindings
var FILE_ACTIONS = [
    {name: 'findFile',
     bindKey : {win: 'Ctrl-X-F', mac: 'Command-X-Command-F'},
     exec: openFile},
    {name: 'writeFile',
     bindKey : {win: 'Ctrl-X-Ctrl-S', mac: 'Command-X-Command-S'},
     exec: saveFile}
];

//Buffer key bindings
var BUFFER_ACTIONS = [
    {name: 'setBuffer',
     bindKey : {win: 'Ctrl-X-B', mac: 'Command-X-B'},
     exec: setBuffer},
    {name: 'shareBuffer',
     exec: shareBuffer,
     bindKey: {win:'Ctrl-X-Z',mac: 'Command-X-Z'}}
];

//Navigation key bindings
var NAVIGATION_ACTIONS = [
    {name: 'navUp',
     exec: navUp,
     bindKey: {win:'Ctrl-P',mac: 'Command-P'}},
    {name: 'navDown',
     exec: navDown,
     bindKey: {win:'Ctrl-M',mac: 'Command-M'}},
    {name: 'navLeft',
     exec: navLeft,
     bindKey: {win:'Ctrl-B',mac: 'Command-B'}},
    {name: 'navRight',
     exec: navRight,
     bindKey: {win:'Ctrl-F',mac: 'Command-F'}}
    ];

//Key bindings for the minibuffer
var MINIBUFFER_RUN =[
    {name: 'runBuffer',
     bindKey : {win: 'return', mac: 'return'},
     exec: runClose},
    {name: 'runCompletion',
     bindKey : {win: 'TAB', mac: 'TAB'},
     exec: runCompletion
    },
    {name: 'runCancel',
     bindKey : {win: 'Ctrl-G', mac: 'Command-G'},
     exec: runCancel
    },
];


var FRAME_KEY_ACTIONS = prelude.concat([FILE_ACTIONS,BUFFER_ACTIONS]);//,NAVIGATION_ACTIONS]);
var MINIBUFFER_KEY_ACTIONS = prelude.concat([MINIBUFFER_RUN]);


//A frame is asociated with a ace editor. The frame also knows which
//buffer it's currently opened in that editor. Also the html div element
//is saved if direct manipulation to the dom is required
//The id of the div that should become an editor is given
function Frame(id){

    //The ace editor
    this.editor = ace.edit(id);
    //Html div element for that Frame
    this.div = $('#'+id);
    //The buffer to which the frame points
    this.buffer = undefined;
    //Add the editor to the map by id. This is used 
    //for referencing the Frame
    editors[id] = this;
    this.id = id;
    
    //Add key bindings
    keyBinder(this,FRAME_KEY_ACTIONS);

    var updateFun = prelude.curry(function(changedEditor,e){
	if(changedEditor.buffer)
	    changedEditor.buffer.content = changedEditor.editor.getValue();
	})(this);

    this.editor.on('change',updateFun);    
    
    this.setValue = function(value){

	var cursor = this.editor.getCursorPosition();
	this.editor.session.doc.setValue(value);
	this.editor.moveCursorToPosition(cursor);
	this.buffer.content = this.editor.getValue();
	
    };
}

//Function used to bind shortcuts from Frames. This assumes
//that the shortcuts have the same format as ACE requires
//and that the function that should be run takes as an 
//argument the Frame where the shortcut was pressed    
var keyBinder = prelude.curry(function(container,actions){
    
    for(var i = 0; i < actions.length; i++){

	var cmd = new Object();
	cmd.name = actions[i].name;
	cmd.bindKey = actions[i].bindKey;
		
	var action = prelude.curry(actions[i].exec);
	cmd.exec = prelude.curry(function(fAction,editor,e){
	    fAction(editor);
	    })(action,container);
	
	if(cmd.bindKey)
	    container.editor.commands.addCommand(cmd);
    }
});

//Utility function to hide a frame
Frame.prototype.setVisible = function(visibility){

    if(visibility)
	this.div.css('visibility','visible');
    else
	this.div.css('visibility','hidden');
};

//Utility function to set the current buffer which
//is being edited by the frame. This function
//saves the current contents in the current buffer,
//changes the buffer and loads the contents from
//that buffer
Frame.prototype.setBuffer= function(buffer){

    if(this.buffer){

	this.buffer.content = this.editor.getValue();
    }

    this.buffer = buffer;
    this.editor.session.doc.setValue(this.buffer.content);
};

//The minibuffer is the small text area below used to obtain
//user input for many of the commands. If the mini-buffer is
//invoked a specified function will be called with the user
//input as parameter before being closed
//The id of the div element that should be used as minibuffer
//should be specified
function MiniBuffer(id){

    this.editor = ace.edit(id);
    this.div = $('#'+id);

    //Buffer for notifications and autocompletions
    this.buffer = new Buffer("*completions*",undefined);

    //The function that will be called before closing
    //the buffer giving the buffers contents as parameter
    this.closeFunction = undefined;

    //This is the function that will be called when tab
    //key is pressed, for auto-completion
    this.completionFunctioin = undefined;

    //Function that is executed if the cancel command is
    //called in the minibuffer
    this.cancelFunction = undefined;

    //Holds the buffer contained in the editor before
    //calling the minibuffer
    this.lastBuffer = undefined;

    //Add key bindings
    keyBinder(this,MINIBUFFER_KEY_ACTIONS);

    //Visibility changing utility function
    this.setVisible = function(visibility){

	if(visibility)
	    this.div.css('visibility','visible');
	else
	    this.div.css('visibility','hidden');
    };

    //This function opens the minibuffer and set the 
    //cursor there ready for input. Args should contain
    //the properties closeFunction, completionFunction
    //and cancelFunction. Only closeFunction is really needed
    //since this is the function that will be called with the
    //user input from the minibuffer as argument after the user
    //presses enter. The completionFunction will be called when
    //the user presses tab and used to generate autocomplete
    //suggestions. The cancelFunction is usually not necessary,
    //but it's called if the user cancels the minibuffer input
    this.getInput = function(args){

	this.lastBuffer = getCurrentEditor().buffer;
	this.setVisible(true);
	this.closeFunction = args.closeFunction;
	this.completionFunction = args.completionFunction;

	if(args.cancelFunction){
	    this.cancelFunction = args.cancelFunction;
	}else
	    this.cancelFunction = prelude.curry(function(miniBuffer,c){
		getCurrentEditor().setBuffer(miniBuffer.lastBuffer);
	    })(this);

	this.editor.focus();
    };

}

//Return the editor where the cursor is currently located
//Must be extended once more editors can be added in the same
//window
function getCurrentEditor(){

    return editor;
}

//Function that is executed when a user presses Tab
//inside the minibuffer, this function calls the current
//completion function, sendin as parameter a object where
//the completions can be written. This was done that way
//so asynchronous calls can be easily handeled by the
//completion functions
function runCompletion(miniBuffer){

    if(miniBuffer.completionFunction){
    
	//This function should be called by the completion
	//function to replace the value of the miniBuffer.
	//As an argument it takes the new text that should be
	//placed in the minibuffer.
	var setValueFun = prelude.curry(function(editor,value){

	    editor.session.doc.setValue(value);
	})(miniBuffer.editor);

	//This is the function that should be called by the completion
	//function binded to this autocomplete call if the function wishes
	//to give auto-complete suggestions. If undefined is given as a 
	//parameter, the previous buffer of the editor will be placed
	var setCompletionsFun = prelude.curry(function(miniBuffer,completion){

	    var editor = getCurrentEditor();
	    if(completion){		
		miniBuffer.buffer.content = completion;
		editor.setBuffer(miniBuffer.buffer);
		editor.setValue(completion);
	    }else{
		
		editor.setBuffer(miniBuffer.lastBuffer);
	    }
	})(miniBuffer);

	var res = {
	    //Calling this funciton will replace the value in the minibuffer
	    setValue: setValueFun,
	    //Calling this function will open the buffer with completion suggestions
	    setCompletions : setCompletionsFun,
	    //This is the current text in the minibuffer
	    value : miniBuffer.editor.getValue()
	};

	miniBuffer.completionFunction(res);

    }
    
}

//This function resets the values of the minibuffer
//to the defaults usualy set when no minibuffer was
//invoked
function resetMinibuffer(miniBuffer){
    
    miniBuffer.closeFunction = undefined;
    miniBuffer.cancelFunction = undefined;
    miniBuffer.completionFunction = undefined;
    miniBuffer.lastBuffer = undefined;
    miniBuffer.editor.setValue("");

    miniBuffer.setVisible(false);

    getCurrentEditor().editor.focus();
}

//Function used to cancel a mini buffer
function runCancel(miniBuffer){

    if(miniBuffer.cancelFunction)
	miniBuffer.cancelFunction(miniBuffer.editor.getValue());

    resetMinibuffer(miniBuffer);
}

//Function used to close the mini buffer
function runClose(miniBuffer){
        
    if(miniBuffer.closeFunction)
	miniBuffer.closeFunction(miniBuffer.editor.getValue());
    
    resetMinibuffer(miniBuffer);
};

//Basic messaging initialization backend
//
//Many features of philip garden can use
//messaging. This function will dispatch
//all messages received. It will inspect
//the content property of a message as
//a json object and from this object it
//will check the the target property,
//this property will be inspected against
//a table of rules to determine what
//function should be executed with this
//message

//This is the array that matches the diverse
//targets for a message to the functions
//that will be executed. Objects in this
//array should have the property
//anyUser for a generic function called
//for any message received, and
//targetUser, for functions that are
//targeted to a user with the tersus api
var msgRules = [];

function defaultMessageCalleback(msg){

    msg.content = eval("("+msg.content+")");

    var action = msgRules[msg.content.target];

    if(action && action.anyUser)
	action.anyUser(msg);
}

function registerCallbackRule(rule,callback){

    msgRules[rule] = callback;
}

//Dispatch function for messages targeted to
//a specific user after a custom user callback
//has been registered
function userCallbackFunction(msg){

    msg.content = eval("("+msg.content+")");

    var action = msgRules[msg.content.target];

    if(action && action.targetUser)
	action.targetUser(msg);
}

//Register a callback dispatcher for a particular
//user if such dispatcher dosen't exist yet
function registerUserCallbackWrapper(user){

    if(!document.tersus.REGISTERED_CALLBACKS[user]){
	
	//Temporary workaround while delivery status is not checked
	document.tersus.sendMessageAsync([user],document.tersus.application,"{}",function(m){});

	document.tersus.registerCallback(user,userCallbackFunction);
    }

}

function loadFileArgs(){

    var files = document.tersus.getArgv();

    files.map(function(f){loadFile(getCurrentEditor(),f)});
}

$(document).ready(function(){

    nArea = $('#notificationsArea');

    //var minibuffer = $("#PhilipGarden").scope().minibuffer;
    //alert(minibuffer);
    //keyBinder(minibuffer,FRAME_KEY_ACTIONS);
    //miniBuffer = new MiniBuffer('miniBuffer');
    //miniBuffer.setVisible(false);

    //editor = new Frame('editor');
    //editor.editor.setTheme("ace/theme/monokai");
    
    var buffer = createBuffer("*scratch*");
    //editor.setBuffer(buffer);
    
    //myMinibuffer = new Editor(
     //       new VirtualRenderer("miniBuffer","ace/theme/monokai"),
      //      new EditSession($scope.minibuffer_document, "ace/text"));
    
    document.tersus.registerDefaultCallback(defaultMessageCalleback);
    document.tersus.initMessaging();

    loadFileArgs();
});

var main = angular.module('Main', []);

/*main.factory('$editorService', function($rootScope){
    var editorService = {};

    editorService.setBuffer = function(filename){
        console.log("editorService.filename: ");
        console.log(filename);
        $rootScope.$broadcast('setEditorBuffer',filename);
    }

    return editorService;
});*/

main.factory('$tersus', function($rootScope){
    return document.tersus;
});

//PhilipGarden.$inject = ['$scope','$editorService']
//BufferCtrl.$inject = ['$scope','$editorService']
DirFileCtrl.$inject = ['$scope', '$rootScope', '$tersus']
