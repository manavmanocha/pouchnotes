var remoteDBURL = "https://dls-builder:Compro11@dls-builder.cloudant.com";
//var remoteDBURL = "http://127.0.0.1:5984";
var databasename = "pouchnotesdummy";

var builddate, buildtime, buttonmenu, editbutton, 
delbutton, hashchanger, 
n, PouchNotesObj, showview, svhandler, viewnotes, searchnotes; 

viewnotes   = document.querySelector('[data-show="#allnotes"]');
buttonmenu = document.getElementById('buttonwrapper');
editbutton = document.querySelector('button[type=button].edit');
delbutton  = document.querySelector('button[type=button].delete');

showview = document.querySelectorAll('button.clicktarget');

/*=============================
Utility functions
===============================*/

PouchNotesObj = function (databasename, remoteorigin) {
    'use strict';
    
    Object.defineProperty(this, 'pdb', {writable: true});
    Object.defineProperty(this, 'remote', {writable: true});
    Object.defineProperty(this, 'formobject', {writable: true});
    Object.defineProperty(this, 'notetable', {writable: true});
 	Object.defineProperty(this, 'searchformobject', {writable: true});
 	Object.defineProperty(this, 'errordialog', {writable: true});
    Object.defineProperty(this, 'dbname', {writable: true});

    this.dbname = databasename;
    this.pdb = new PouchDB(databasename);
    this.remote = remoteorigin + '/'+databasename;

};


PouchNotesObj.prototype.buildtime = function(timestamp){
    var ts = new Date(+timestamp), time = [], pm, ampm;
    
    pm = (ts.getHours() > 12);
    
    time[0] = pm ? ts.getHours() - 12 : ts.getHours();
    time[1] = ('0'+ts.getMinutes()).substr(-2);
    
    if( time[0] == 12 ){
    	ampm = 'pm';
    } else {
    	ampm = pm ? 'pm' : 'am';
    }
    
    return ' @ '+time.join(':') + ampm ; 
}

PouchNotesObj.prototype.builddate = function (timestamp) {
    var d = [], date = new Date(timestamp);
   
    d[0] = date.getFullYear();
    d[1] = ('0'+(date.getMonth() + 1)).substr(-2);
    d[2] = ('0'+date.getDate()).substr(-2);
    return d.join('-');
} 

/* 
Create a function to log errors to the console for
development.
*/

PouchNotesObj.prototype.reporter = function (error, response) {
    'use strict';
    if (console !== undefined) {
        if (error) { console.log(error); }
        if (response) { console.log(response); }
    }
};

PouchNotesObj.prototype.showerror = function (error) {
    var o, txt, msg = this.errordialog.getElementsByClassName('msg')[0];
    for(o in error){
    	txt = document.createTextNode(error[o]);
    	msg.appendChild(txt);
    }
    this.errordialog.toggleClass('hide');
};

PouchNotesObj.prototype.show = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.remove('hide');
    });
};
PouchNotesObj.prototype.hide = function (selector) {
    'use strict';
    var els = document.querySelectorAll(selector);
    Array.prototype.map.call(els, function (el) {
        el.classList.add('hide');
    });
};
PouchNotesObj.prototype.resethash = function () {
    window.location.hash = '';   
}

PouchNotesObj.prototype.savenote = function () {
    'use strict';
    var o = {}, that = this;

    /* 
    If we have an _id, use it. Otherwise, create a timestamp
    for to use as an ID. IDs must be strings, so convert with `+ ''`
    */
    if (!this.formobject._id.value) {
        o._id = new Date().getTime() + ''; 
    } else {
        o._id = this.formobject._id.value;
    }
    
    if (this.formobject._rev.value) {
        o._rev = this.formobject._rev.value; 
    }
    
    /* 
    Build the object based on whether the field has a value.
    This is a benefit of a schema-free object store type of 
    database. We don't need to include values for every property.
    */
    
    o.notetitle = (this.formobject.notetitle.value == '') ? 'Untitled Note' : this.formobject.notetitle.value;
    o.note      = (this.formobject.note.value == '') ? '' : this.formobject.note.value;
    o.tags      = (this.formobject.tags.value == '') ? '' : this.formobject.tags.value;
    o.tags      = (this.formobject.tags.value == '') ? '' : this.formobject.tags.value;
    o.category  = (this.formobject.category.value == '') ? '' : this.formobject.category.value;
    
    this.pdb.put(o, function (error, response) {
        if(error){
            that.showerror(error);
        }
        
        if(response && response.ok){     	    	
     		if(that.formobject.attachment.files.length){
				var reader = new FileReader();
				
				/* 
				Using a closure so that we can extract the 
				File's data in the function.
				*/
				reader.onload = (function(file){
					return function(e) {
						that.pdb.putAttachment(response.id, file.name, response.rev, e.target.result, file.type);
					}
				})(that.formobject.attachment.files.item(0));
				
				reader.readAsDataURL(that.formobject.attachment.files.item(0));
			}
			    	   			
           	that.viewnoteset();
        	that.formobject.reset();
        	
        	that.show(that.formobject.dataset.show);
           	that.hide(that.formobject.dataset.hide);
        	
           	viewnotes.dispatchEvent(new MouseEvent('click')); 
		}
    });
 	
 	this.resethash();
};

PouchNotesObj.prototype.viewnote = function (noteid) {
    'use strict';
    
    var that = this, noteform = this.formobject;
    
    this.pdb.get(noteid, {attachments:true}, function (error, response) {
        var fields = Object.keys(response), o, link, attachments, li;
    
    	if (error) {
           	this.showerror();
            return;
        } else {
        	
        	fields.map( function (f) {
				if (noteform[f] !== undefined && noteform[f].type != 'file') {
					noteform[f].value = response[f];
				}
				if (f == '_attachments') {
					attachments = response[f];
					for (o in attachments) {
						li = document.createElement('li');
						link = document.createElement('a');
						link.href = 'data:' + attachments[o].content_type + ';base64,' + attachments[o].data;
						link.target = "_blank";
						link.appendChild(document.createTextNode(o));
						li.appendChild(link);
					}
					document.getElementById('attachmentlist').appendChild(li);
								
				}	
			})
                
            // fill in form fields with response data.     
            that.show('#addnote');
            that.hide('section:not(#addnote)');
            that.show('#attachments');	
        } 
    }); 
    
 	if (window.location.hash.indexOf(/view/) > -1 ) {
        // disable form fields
        noteform.classList.add('disabled');
        
        Array.prototype.map.call( noteform.querySelectorAll('input, textarea'), function(i){
        	if (i.type !== 'hidden') {
        		i.disabled = 'disabled';
        	}
        });
        
        buttonmenu.classList.remove('hide');
    }
}

PouchNotesObj.prototype.deletenote = function (noteid) {
	var that = this;
	/* IDs must be a string */
    
 	this.pdb.get(noteid+'', function (error, doc) {
		that.pdb.remove(doc, function (e, r) {	
        	if(e){
        		that.showerror();
        	} else {
        		viewnotes.dispatchEvent(new MouseEvent('click'));
        	}            
    	});
    });
}

/* 
TO DO: refactor so we can reuse this function.
*/
PouchNotesObj.prototype.viewnoteset = function (start, end) {
    var i, 
    that = this, 
    df = document.createDocumentFragment(), 
    options = {}, 
    row,   
    nl = this.notetable.querySelector('tbody');    
		
    options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }

    function map(doc) {
      // sort by notetitle
      emit(doc.notetitle);
    }
    
    this.pdb.query(map, {include_docs: true}, function (error, response) {
    	/* 
    	What's `this` changes when a function is called
    	with map. That's why we're passing `that`.
    	*/    	
        row = response.rows.map(that.addrow, that);
        row.map(function(f){
        	if (f) {
            	df.appendChild(f); 
            } 
        });
        
        i = nl.childNodes.length;    
		while(i--){
			nl.removeChild(nl.childNodes.item(i));   
		}
	
        nl.appendChild(df);
    });
    
    this.resethash();
}

/* 
TO DO: sync notes.
*/
PouchNotesObj.prototype.syncnoteset = function (start, end) {
    var start = new Date().getTime();
    document.getElementById("syncbutton").innerHTML = "Syncing...";
    document.getElementById("loadingImage").style.display = "block";
    
    var i, 
    that = this, 

    // filter: function (doc) {
    //         return doc.category === 'MyNotes';
    //     } 

    //"doc_ids":["1450779769685"]   
    
    
    options = { 
    doc_ids:['1450853987668']   
  };
     
        
    //options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }
    
   
    PouchDB.sync(this.dbname, this.remote,  {doc_id : ['1450853987668'] })
    //this.pdb.sync(this.remote, { doc_id:['1450853987668'] })
    .on('change', function (info) {
  // handle change
    }).on('paused', function () {
      // replication paused (e.g. user went offline)
    }).on('active', function () {
      // replicate resumed (e.g. user went back online)
    }).on('denied', function (info) {
      // a document failed to replicate, e.g. due to permissions
    }).on('complete', function (info) {
      console.log("Sync Complete");
      document.getElementById("syncbutton").innerHTML = "Sync Notes";
      document.getElementById("loadingImage").style.display = "none";
      that.viewnoteset();
      that.formobject.reset();    
      that.show(that.formobject.dataset.show);
      that.hide(that.formobject.dataset.hide);
      var end = new Date().getTime();
      console.log("Time Taken - " + (end - start) + " ms");
    }).on('error', function (err) {
      console.log("Sync Error:" + err);  
      alert("Sync Error:" + err);
      that.showerror(error);
    });   
    
}

PouchNotesObj.prototype.resetpouchdb = function (start, end) {
    document.getElementById("loadingImage").style.display = "block";
    var start = new Date().getTime();
    var that = this;
           
   
    this.pdb.destroy().then(function() {
        that.pdb = new PouchDB(that.dbname);
        document.getElementById("loadingImage").style.display = "none";        
         var end = new Date().getTime();
         console.log("Time Taken to resetpouchdb- " + (end - start) + " ms");
        that.formobject.reset();
        that.notetable.getElementsByTagName('tbody')[0].innerHTML='';
        that.show(that.formobject.dataset.show);
        that.hide(that.formobject.dataset.hide);
    });      
    
}

/* 
TO DO: refactor so we can reuse this function.
*/
PouchNotesObj.prototype.adddefaultnoteset = function (start, end) {
    var i, 
    that = this, 
    
    options = {};
     
        
    //options.include_docs = true;
    
    if(start){ options.startkey = start; }
    if(end){ options.endkey = end; }
    for (i = 0; i < defaultNotes.length; i++) {
    var doc = defaultNotes[i];
        this.pdb.put(doc).then(function (response) {
        //handle response
        console.log("Added doc" + doc);
        }).catch(function (err) {
          console.log(err);
        });  
    }    
}

PouchNotesObj.prototype.addrow = function (obj) {
    var tr, td, a, o, created;
 	
    a  = document.createElement('a');
    tr = document.createElement('tr');
    td = document.createElement('td'); 
    
    a.href = '#/view/'+obj.id;
    a.innerHTML = obj.doc.notetitle === undefined ? 'Untitled Note' : obj.doc.notetitle;
    td.appendChild(a);
    tr.appendChild(td);

    category = td.cloneNode(false);
    category.innerHTML = obj.doc.category;

    created = category.cloneNode(false);
    created.innerHTML = this.builddate(+obj.id) + this.buildtime(+obj.id);
      
    updated = created.cloneNode();
    updated.innerHTML = obj.doc.modified ? this.builddate(+obj.doc.modified) + this.buildtime(+obj.doc.modified) : this.builddate(+obj.id) + this.buildtime(+obj.id);
    
    tr.appendChild(category);
    tr.appendChild(created);
    tr.appendChild(updated);
  
    return tr;    
}

PouchNotesObj.prototype.addbulknotes = function () {
    document.getElementById("loadingImage").style.display = "block";
    var that = this;
    var start = 1;
    var end = 1000;
    var docs = [];
    var description = 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.';
    for (var i = start; i <= end; i++) {
        var randomNumber = Math.floor((Math.random() * 100000) + 1);
        docs.push({
            "notetitle": "note title " + randomNumber,
            "note": description,
            "tags": randomNumber,
            "category": "MyNotes",
            "_id" : new Date().getTime() + i + ""
        });
    }

    this.pdb.bulkDocs(docs).then(function (result) {
      doAfterAddbulkNotes();
    }).catch(function (err) {
      doAfterAddbulkNotes();
    });   

    function doAfterAddbulkNotes() {
        document.getElementById("loadingImage").style.display = "none";
        that.viewnoteset();
        that.formobject.reset();    
        that.show(that.formobject.dataset.show);
        that.hide(that.formobject.dataset.hide); 
    }
}


PouchNotesObj.prototype.search = function(searchkey) {
	var that = this;

	var map = function(doc) {
		/* 
		Need to do grab the value directly because 
		there isn't a way to pass it any other way.
		*/
		
		var searchkey,regex;
		searchkey = document.getElementById('q').value.replace(/[$-\/?[-^{|}]/g, '\\$&');
		regex = new RegExp(searchkey,'i');
		
		if( regex.test(doc.notetitle) || regex.test(doc.note) || regex.test(doc.tags) ){		
			emit(doc._id, {notetitle: doc.notetitle, id: doc._id, modified: doc.modified});
		}
	}
	
  	this.pdb.query(map, function(err, response) { 
  		if(err){ console.log(err); }
  		if(response){
	 		var df, rows, nl, results;
	 		
	 		results = response.rows.map(function(r){
  				r.doc = r.value;
  				delete r.value;
  				return r;
  			});
  			nl = that.notetable.getElementsByTagName('tbody')[0];
  			df = document.createDocumentFragment(), 
  			rows = results.map(that.addrow, that);
  			rows.map(function(f){
        		if (f) {
            		df.appendChild(f); 
            	} 
        	});
        	nl.innerHTML = '';
        	nl.appendChild(df);
  		}
  	});
}


/*------ Maybe do in a try-catch ? ------*/
pn = new PouchNotesObj(databasename, remoteDBURL);

pn.formobject = document.getElementById('noteform');
pn.notetable  = document.getElementById('notelist');
pn.searchformobject  = document.getElementById('searchnotes');
pn.errordialog  = document.getElementById('errordialog');

pn.searchformobject.addEventListener('submit', function (e) {
   'use strict';
    e.preventDefault();
    pn.search(); 
});

pn.formobject.addEventListener('submit', function (e) {
    e.preventDefault();
    pn.savenote()
});

pn.formobject.addEventListener('reset', function (e) {
    var disableds = document.querySelectorAll('#noteform [disabled]');
    e.target.classList.remove('disabled');
    Array.prototype.map.call(disableds, function(o){
        o.removeAttribute('disabled'); 
    });
    pn.hide('#attachments');
    document.getElementById('attachmentlist').innerHTML = '';
});

window.addEventListener('hashchange', function (e) {
    var noteid;
    if(window.location.hash.replace(/#/,'') ){
        noteid = window.location.hash.match(/\d/g).join('');
        pn.viewnote(noteid);
    }
});

svhandler = function (evt) {
	var attchlist = document.getElementById('attachmentlist');
	
    if (evt.target.dataset.show) {
        pn.show(evt.target.dataset.show);
    }
    if (evt.target.dataset.hide) {
        pn.hide(evt.target.dataset.hide);
    }
    
    if (evt.target.dataset.action) {
        pn[evt.target.dataset.action]();
    }
    
    if (evt.target.dataset.show === '#addnote') {
        pn.formobject.reset();
        
        /* Force reset on hidden fields. */
        pn.formobject._id.value = ''; 
        pn.formobject._rev.value = ''; 
    }
    pn.hide('#attachments');
    attchlist.innerHTML = '';
    pn.searchformobject.reset();
    pn.resethash();
};

/* TO DO: Refactor these click actions to make the functions reusable */

editbutton.addEventListener('click', function (e) {
    pn.formobject.classList.remove('disabled'); 
    
     Array.prototype.map.call( pn.formobject.querySelectorAll('input, textarea'), function(i){
		if (i.type !== 'hidden') {
			i.removeAttribute('disabled');
		}
	});
});

delbutton.addEventListener('click', function (e) {
    pn.deletenote(+e.target.form._id.value);
});

Array.prototype.map.call(showview, function (ct) {
    ct.addEventListener('click', svhandler);
});
   
Array.prototype.map.call(document.getElementsByClassName('dialog'), function (d) {
    d.addEventListener('click', function(evt){
        if(evt.target.dataset.action === 'close'){
            d.classList.add('hide');
        };
    });
});

window.addEventListener('DOMContentLoaded', function(event){
    viewnotes.dispatchEvent(new MouseEvent('click'));
});

pn.formobject.addEventListener('change', function(event){
	if(event.target.type === 'file'){
		var fn = event.target.value.split('\\');
		document.querySelector('.filelist').innerHTML = fn.pop();
	}
});
