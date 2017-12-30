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

var db = admin.database();
var usersRef = db.ref("users");

exports.handler = function(token, uid) {
	var now = new Date();
    FB.options({version: 'v2.4'});
    var fooApp = FB.extend({appId: '86060211695', appSecret: '288b6d6471fc6016daf90d918b8d0f33'});
    fooApp.setAccessToken(token);
    // get user information
	fooApp.api('me', { fields: 'id,first_name,last_name,gender,email,birthday,picture' }, function (res) {
	    console.log(res);
	    usersRef.child(uid).set({
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
	fooApp.api('me/taggable_friends', { fields: 'id,first_name,last_name,picture' }, function (res) {
		console.log(res);
		usersRef.child(uid).child("taggable_fb_friends").push().set({
			birthday: dateFormat(now, "mm/dd/yyyy"),
			displayPhotoUrl: res.picture != null ? res.picture.data.url : "",
			facebook_userId: res.id,
			first_name: res.first_name,
			last_name: res.last_name
		});
	});
}