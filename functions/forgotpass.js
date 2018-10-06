'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');
const sendgridModule = require('./mail_util');

exports.handler = function(req, res) {
  var json_res = {
  	code: 100,
  	message: "A Change Password instruction has been sent to your email. Please check"
  };
  admin.auth().getUserByEmail(req.params.email)
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log("Successfully fetched user data:", userRecord.uid);
    var dt = new Date();
    const reqDate = moment.utc(dt).format("DD/MM/YYYY HH:mm:ss");
    const exDate = moment.utc(dt).add(20, 'm').format("DD/MM/YYYY HH:mm:ss")
    // create new node user_reset
    var user_reset = {
    	uid: userRecord.uid,
    	email: req.params.email,
      requestDate: reqDate,
      expiryDate: exDate
    };
    admin.database().ref(`users/${userRecord.uid}`).once('value').then(snapshot => {
    	return snapshot.val();
    }).then(customer => {
    	if(customer.info.user_reset == null || customer.info.user_reset == false) {
	    	var pushRef = admin.database().ref(`user_reset`).push(user_reset);
	    	console.log("Done saving user reset ID:", pushRef.key);
	  		customer.info.user_reset = pushRef.key;
	  		admin.database().ref(`users/${userRecord.uid}/info`).set(customer.info);
        /// Send email function
        sendForgotPassEmail(customer.info, pushRef.key);
        res.json(json_res);
    	} else {
    		console.log("User Already sent request for change password:", customer.info.user_reset);
    		admin.database().ref(`user_reset/${customer.info.user_reset}`).once('value').then(snapdata => {
    			//console.log(snapdata.toJSON());
          var resetData = snapdata.val();
          var now = moment.utc(dt).format("DD/MM/YYYY HH:mm:ss");
          var then = resetData.expiryDate;
          var isBefore = moment(now,"DD/MM/YYYY HH:mm:ss").isBefore(moment(then,"DD/MM/YYYY HH:mm:ss"));
          console.log(`${now} isBefore ${then} =`, isBefore);
          
          // check if more than 20 mins
          if(!isBefore) {
            console.log("Is more than 20 Minutes");
            console.log("removing old data from user_reset:", customer.info.user_reset);
            admin.database().ref(`user_reset/${customer.info.user_reset}`).remove();
            var pushRef = admin.database().ref(`user_reset`).push(user_reset);
            console.log("Done saving user reset ID:", pushRef.key);
            customer.info.user_reset = pushRef.key;
            admin.database().ref(`users/${userRecord.uid}/info`).set(customer.info);
            /// Send email function
            sendForgotPassEmail(customer.info, pushRef.key);
          }
          json_res.code = 102;
          json_res.message = "Validation message.";
          //json_res.message = "You already requested for a change password. Please check your email.";
          res.json(json_res);
    		})
        .catch(function(error) {
          console.log(`Error within user_reset function query`, error);
          json_res.code = 305;
          json_res.message = "An error has occured."
          res.json(json_res);
        });
    	}
    });
  })
  .catch(function(error) {
    console.log(`Error fetching user data with email ${req.params.email}:`, error);
    json_res.code = 304;
    json_res.message = "An error has occured."
    res.json(json_res);
  });
}

function sendForgotPassEmail(newUser, tokenId) {
  console.log("newUser:",newUser);
  const msg = {
    to: `${newUser.email}`,
    from: 'no-reply@dancesportregistration.com',
    subject: `Forgot Password Request`,
    text: ' ',
    html: '<p> </p>',
    templateId: "WELCOME_TEMPLATE_ID",
    substitutions: {
      userName: `${newUser.first_name}`,
      tokenId: tokenId
    },
  };
  
  sendgridModule.handler("FORGOTPASS_TEMPLATE", msg);
}