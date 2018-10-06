'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');
const sendgridModule = require('./mail_util');

exports.handler = function(req, res) {
	const userResetRef = admin.database().ref(`user_reset`);
	var dt = new Date();
	var json_res = {
  		code: 100,
  		message: "Success"
    };
    var tokenId = req.body.tokenId;
    var newPassword = req.body.password;
    console.log(`TOKEN: ${req.body.tokenId}, PASSWORD: ${req.body.password}`);

    userResetRef.child(tokenId).once('value').then(snapshot => {
    	//console.log("Snapdata:", snapshot.val());
    	var user_reset = snapshot.val();
    	return user_reset;
    }).then(userReset => {
    	console.log("user reset:",userReset);
    	if(userReset == null) {
    		json_res.code = 304;
    		json_res.message = "An error has occured";
    		res.send(json_res);
    	}
    	else {
	    	var now = moment.utc(dt).format("DD/MM/YYYY HH:mm:ss");
	      	var then = userReset.expiryDate;
	      	var isBefore = moment(now,"DD/MM/YYYY HH:mm:ss").isBefore(moment(then,"DD/MM/YYYY HH:mm:ss"));
	      	console.log(`${now} isBefore ${then} =`, isBefore);

	        if(!isBefore) {
	        	console.log("Is more than 20 Minutes. User needs to request password change again.");
	        	json_res.code = 305;
	    		json_res.message = "An error has occured";
	    		res.send(json_res);
	        }
	    	else {
	    		//res.send(json_res);
		    	admin.auth().updateUser(userReset.uid, {
			      email: userReset.email,
			      password: newPassword
			    }).then((updateResponse) => {
			      console.log("removing user_reset on user");
			      admin.database().ref(`users/${userReset.uid}/info/user_reset`).remove();
			      console.log("removing user_reset node");
		    	  userResetRef.child(tokenId).remove();
		    	  admin.database().ref(`users/${userReset.uid}/info`).once('value').then(snapshot => {
		    	  	sendChangePassEmail(snapshot.val());
		    	  });
			      return res.send(json_res);
			    }).catch((error) => {
			      return res.send({
			        code: 304,
			        message: 'An error has occured'
			      });
			    });
	    	}
	    }
    });
}

function sendChangePassEmail(newUser) {
  const msg = {
    to: `${newUser.email}`,
    from: 'no-reply@dancesportregistration.com',
    subject: `Change Password Success`,
    text: ' ',
    html: '<p> </p>',
    templateId: "CHANGEPASS_TEMPLATE_ID",
    substitutions: {
      userName: `${newUser.first_name}`
    },
  };
  
  sendgridModule.handler("CHANGEPASS_TEMPLATE", msg);
}