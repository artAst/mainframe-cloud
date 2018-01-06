//var request = require('request');
var FB = require('fb');
var admin = require("firebase-admin");
var dateFormat = require('dateformat');
/*exports.handler = function(req,res) {
	request('https://graph.facebook.com', function (error, response, body) {
	  console.log('error:', error); // Print the error if one occurred
	  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
	  console.log('body:', body); // Print the HTML for the Google homepage.
	});
	res.status(200).send("Success!");
}*/

const _appId = '137803466893195';
const _appSec = 'd8f31f3e79a4cf40deaa87899e213c58';
var db = admin.database();
var usersRef = db.ref("users");
var taggableRef = usersRef.child("taggable_friends");

exports.handler = function(token, uid) {
	var now = new Date();
    FB.options({version: 'v2.4'});
    var fooApp = FB.extend({appId: _appId, appSecret: _appSec});
    fooApp.setAccessToken(token);
    // get user information
	fooApp.api('me', { fields: 'id,first_name,last_name,gender,email,birthday,picture' }, function (res) {
	    console.log(res);
	    usersRef.child(uid).child("info").set({
	    	birthday: res.birthday != null ? res.birthday : dateFormat(now, "mm/dd/yyyy"),
	    	displayPhotoUrl: res.picture != null ? res.picture.data.url : "",
	    	email: res.email,
	    	facebook_userId: res.id,
	    	first_name: res.first_name,
	    	last_name: res.last_name,
	    	gender: res.gender != null ? (res.gender.toUpperCase() == "MALE" ? "MAN" : "WOMAN") : null
	    });
	});
	// get taggable friends for users
	requestTaggableFriends(fooApp, uid, "");
}

function requestTaggableFriends(fooApp, uid, after) {
	var now = new Date();
	var uri = "me/taggable_friends";
	var _params = {};
	_params['fields'] = 'id,first_name,last_name,picture';
	if(after != "") {
		//uri += "&after="+after;
		_params['after'] = after;
    }

	fooApp.api(uri, _params, function (res) {
		//console.log(res);
		//console.log(res.data.length);
		//console.log(res.data[0]);
		for(var i=0; i < res.data.length; i++) {
			//console.log(res.data[i]);
			usersRef.child(uid).child("taggable_friends").push().set({
				birthday: dateFormat(now, "mm/dd/yyyy"),
				displayPhotoUrl: res.data[i].picture != null ? res.data[i].picture.data.url : "",
				//facebook_userId: "${itm.id}",
				first_name: res.data[i].first_name,
				last_name: res.data[i].last_name
			});
		}

		if(res.paging != null){
			var _aft = "";
			var _cursors = res.paging.cursors;
			if(_cursors != null) {
				_aft = _cursors.after;
				console.log(_aft);
				requestTaggableFriends(fooApp, uid, _aft);
			}
		}
	});
}