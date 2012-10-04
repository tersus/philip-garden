//Philip Garden
//
//Liscence: BSD
//
//Emacs-like text editor for the web that runs on top of tersus. It has the ability
//to share files and syncronize updates

function saveText(){
    tersus.writeFile("/Monad.hs",editor.editor.getValue(),function(msg){alert(msg)});
}

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
    this.shadow = "";
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
	completionFunction:function(bufferName){

	    
	    var suggestions = getBuffersLike(bufferName);

	    var ret = new Object();

	    if(suggestions.length == 1){
	    	ret.result = suggestions[0].name;
	    }else
	    	ret.result=bufferName;

	    ret.completions = "";

	    for(var i=0;i<suggestions.length;i++)
	    	ret.completions = ret.completions + suggestions[i].name + "\n";

	    return ret;
	    
	}
	});
}

//Open a file and load it into a new buffer. This function uses
//the minibuffer to get the filename from the user and puts
//the contents of the file in the given editor.
function openFile(editor){

    miniBuffer.getInput({
	closeFunction:function(filename){

	    var buffer = getBufferByFilename(filename);

	    if(buffer)
		editor.setBuffer(buffer);
	    else
		tersus.getFile(filename
			       ,function(c){openBuffer(editor,filename,c);}
			       ,{'errorCallback' : function(e){openBuffer(editor,filename,"");}});

	    editor.editor.focus();
    }});
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

    }else
	saveEditorFile(editor);
	
}

//Some emacs like shortcuts for the editor
var FRAME_KEY_ACTIONS = [
    {name: 'findFile',
     bindKey : {win: 'Ctrl-X-Ctrl-F', mac: 'Command-X-Command-F'},
     exec: openFile},
    {name: 'writeFile',
     bindKey : {win: 'Ctrl-X-Ctrl-S', mac: 'Command-X-Command-S'},
     exec: saveFile},
    {name: 'setBuffer',
     bindKey : {win: 'Ctrl-X-B', mac: 'Command-X-B'},
     exec: setBuffer}
    ];

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
}
    
var keyBinder = prelude.curry(function(container,actions){
    
    for(var i = 0; i < actions.length; i++){

	var cmd = new Object();
	cmd.name = actions[i].name;
	cmd.bindKey = actions[i].bindKey;
		
	var action = prelude.curry(actions[i].exec);
	cmd.exec = prelude.curry(function(fAction,editor,e){
	    fAction(editor);
	    })(action,container);
	
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

//Key bindings for the minibuffer
var MINIBUFFER_KEY_ACTIONS = [
    {name: 'runBuffer',
     bindKey : {win: 'return', mac: 'return'},
     exec: runClose},
    {name: 'runCompletion',
     bindKey : {win: 'TAB', mac: 'TAB'},
     exec: runCompletion
    }];


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

    //Add key bindings
    keyBinder(this,MINIBUFFER_KEY_ACTIONS);

    //Visibility changing utility function
    this.setVisible = function(visibility){

	if(visibility)
	    this.div.css('visibility','visible');
	else
	    this.div.css('visibility','hidden');
    };

    //Open a minibuffer using f as the 
    //collapse function
    this.getInput = function(args){

	this.setVisible(true);
	this.closeFunction = args.closeFunction;
	this.completionFunction = args.completionFunction;
	this.editor.focus();
    };

}

//Return the editor where the cursor is currently located
function getCurrentEditor(){

    return editor;
}

//Function that is executed when a user presses Tab
//inside the minibuffer, this function calls the current
//completion function of the minibuffer and writes the
//result to the minibuffer and editor.
function runCompletion(miniBuffer){

    var res;
    if(miniBuffer.completionFunction){
	res = miniBuffer.completionFunction(miniBuffer.editor.getValue());

	miniBuffer.editor.session.doc.setValue(res.result);

	if(res.completions){
	    
	    var editor = getCurrentEditor();
	    miniBuffer.buffer.content = res.completions;
	    editor.setBuffer(miniBuffer.buffer);
	}
    }
    
}

//Function used to close the mini buffer
function runClose(miniBuffer){
        
    if(miniBuffer.closeFunction)
	miniBuffer.closeFunction(miniBuffer.editor.getValue());
    
    miniBuffer.closeFunction = undefined;
    
    miniBuffer.editor.setValue("");

    miniBuffer.setVisible(false);
};

$(document).ready(function(){

    nArea = $('#notificationsArea');

    miniBuffer = new MiniBuffer('miniBuffer');
    miniBuffer.setVisible(false);

    editor = new Frame('editor');
    editor.editor.setTheme("ace/theme/monokai");
    
    var buffer = createBuffer("*scratch*");
    editor.setBuffer(buffer);

    document.tersus.initMessaging();
});
