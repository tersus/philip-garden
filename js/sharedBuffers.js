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

sharedBuffers.js

This file contains the buffer syncronization functionality of Philip Garden.
It uses the differential synchronization algorithm to keep two documents in
sync. It relies on the Tersus messaging components to archive this.

*/

//Namespace object
var Sync = new Object();

//The target that will be used to identify messages used for syncronization
//purposes
Sync.target = 'sync';

//Object that represents the list of all buffers
//being synced.
Sync.BufferTargetHolder = function(){

    //Add a new buffer to the list of synced buffers, indexed
    //by user and syncId. The syncId is a random number
    //that will be used to identify the buffer to which 
    //a particular set of received changes belong to
    this.addSyncBuffer = function(user,buffer,syncId){

	if(!this[user]){
	    this[user] = [];
	}
	
	this[user][syncId] = buffer;
    }

    //Get the buffer that corresponds to the
    //given user and syncId.
    this.getSyncBuffer = function(user,syncId){

	return this[user][syncId];
    }

};

//Global container of all the buffers that are 
//being synchronized
Sync.bufferTargets = new Sync.BufferTargetHolder();

//The type of editions a buffer can have.
//Update: small changes that can be easily applied
//Replace: used to send dramatic changes that the most convenient
//         way to apply is by replacing the content.
Sync.EDIT_TYPE = {
    update : 'update',
    replace : 'replace'
};

//The time that changes will be tracked
//before being sent
Sync.SYNC_DELAY = 2000;

//Share a buffer with the given user
Sync.shareBuffer = function(buffer,user){

    buffer.shadow[user] = buffer.content;
    
    var data = {
	//This will be used to track the sync with the given user
	syncId : Math.floor(Math.random()*100000),
	target : Sync.target,
	file : buffer.file,
	content : buffer.shadow[user],
    };

    Sync.bufferTargets.addSyncBuffer(user,buffer,data.syncId);

    registerUserCallbackWrapper(user);

    document.tersus.sendMessageAsync([user],document.tersus.application,JSON.stringify(data),function(r){});

    //Somehow wait for acknowledgement form other user and retry if not received
}

//Funciton that is executed in order to receive a buffer that will be synced
//It creates a new buffer that will be kept syncrhonized among the users
Sync.receiveSharedBuffer = function(msg){

    var buffer = createBuffer(makeBufferNameFromFile(msg.content.file));
    buffer.content = msg.content.content;
    buffer.shadow[msg.userSender] = buffer.content;
    Sync.bufferTargets.addSyncBuffer(msg.userSender,buffer,msg.content.syncId);
    registerUserCallbackWrapper(msg.userSender);
    Sync.sendEdits(buffer,msg.userSender,msg.content.syncId);
    getCurrentEditor().setBuffer(buffer);
}

//Function that sends the changes that the given
//buffer has undergone to the user and the given
//syncId.
Sync.sendEdits = function(buffer,user,syncId){

    //Get the current text
    var text = buffer.content;
    //Compare the text with the last text synced with user (called shadow)
    var ptc = Sync.diff.diff_main(buffer.shadow[user],text,true);
    //Create a patch with the discovered changes
    var delta = Sync.diff.patch_make(buffer.shadow[user],text,ptc);
    //Update the last synced changes to the new obtained text
    buffer.shadow[user] = text;
    
    var updates = {
	delta : delta,
	syncId : syncId,
	editType : Sync.EDIT_TYPE.update,
	hash : CryptoJS.MD5(text).toString(),
	target : Sync.target
    };

    document.tersus.sendMessageAsync([user],document.tersus.application,JSON.stringify(updates),function(m){});

    //Check that edits where received
}

//Function that sends the complete contents of a buffer
//as a change. It's used to synchronize buffers that
//went out of sync or to send massive changes.
Sync.sendBuffer = function(buffer,user,syncId){

    var updates = {
	editType : Sync.replace,
	syncId : syncId,
	content : buffer.content,
	target : Sync.target
    };

    buffer.shadow[user] = updates.content;
    
    document.tersus.sendMessageAsync([user],document.tersus.application,JSON.stringify(updates),function(m){});

    //Check that the update was received
}

//Function that is called to receive changes from another user
//this function checksums the changes to make sure consistency 
//is kept and applies the changes. It also restarts synchronization
//if two buffers went out of sync.
Sync.receiveEdits = function(msg){

    var updates = msg.content;
    var buffer = Sync.bufferTargets.getSyncBuffer(msg.userSender,msg.content.syncId);

    //Check that syncing is being accepted from the user, if no buffer
    //is returned, it means that the user closed the shared buffer.
    if(!buffer){
	return;
    }

    var editor = getEditorForBuffer(buffer);

    switch(updates.editType){

    case Sync.EDIT_TYPE.update:
	
	buffer.shadow[msg.userSender] = Sync.diff.patch_apply(updates.delta,buffer.shadow[msg.userSender])[0];	

	if(CryptoJS.MD5(buffer.shadow[msg.userSender]).toString() == updates.hash){

	    var patch = updates.delta;	    
	    

	    //Check if the synced buffer is currently being edited
	    if(editor){
	
		//TODO: This will fail if the document has changed too much, in that case the document should
		//be sent again, since it means things are in sync, but massive edit occured
		editor.setValue(Sync.diff.patch_apply(patch,editor.editor.getValue())[0]);
	    }else
		buffer.content = Sync.diff.patch_apply(patch,buffer.content)[0];

	    setTimeout(function(){Sync.sendEdits(buffer,msg.userSender,msg.content.syncId);},Sync.SYNC_DELAY);
	}else{
	    Sync.sendBuffer(buffer,msg.userSender,updates.syncId);
	}

	break;
	
    case EDIT_TYPE.replace:
	
	if(editor){
	    editor.setValue(updates.content);
	 

	}else{
	    buffer.content = updates.content;
	}

	buffer.shadow = updates.content;
	setTimeout(function(){sendEdits(buffer,msg.userSender,msg,syncId);},Sunc.SYNC_DELAY);

	break;
    };
}

$(document).ready(function(){
    Sync.diff = new diff_match_patch();

    registerCallbackRule(Sync.target,{	
	anyUser : Sync.receiveSharedBuffer,
	targetUser : Sync.receiveEdits
    });
});
