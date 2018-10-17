'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');
const sendgridModule = require('./mail_util');
// http request
const request = require('request-promise');

var shortlinks = "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=";

exports.handler = function(req, res) {
  var json_res = {
  	code: 100,
  	message: "A Change Password instruction has been sent to your email. Please check"
  };

  /*createShortLink("tokenIdaskdkjas").then(resp => {
    console.log("request done", resp.shortLink);
    /// Send email function
    //sendForgotPassEmail(customer.info, resp);
    res.json(json_res);
  }).catch(function (error){
    console.log(error.message);
    json_res.code = 500;
    json_res.message = "Internal error";
    res.json(json_res);
  });*/
  
  admin.auth().getUserByEmail(req.params.email)
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log("Successfully fetched user data:", userRecord.uid);
    var dt = new Date();
    const reqDate = moment.utc(dt).format("YYYY/MM/DD HH:mm:ss");
    const exDate = moment.utc(dt).add(20, 'm').format("YYYY/MM/DD HH:mm:ss")
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
        /// generate short link
        createShortLink(pushRef.key).then(resp => {
          console.log("request done");
          /// Send email function
          sendForgotPassEmail(customer.info, resp.shortLink);
          res.json(json_res);
        }).catch(function (error){
          json_res.code = 500;
          json_res.message = "Internal error";
          res.json(json_res);
        });
    	} else {
    		console.log("User Already sent request for change password:", customer.info.user_reset);
    		admin.database().ref(`user_reset/${customer.info.user_reset}`).once('value').then(snapdata => {
    			//console.log(snapdata.toJSON());
          var resetData = snapdata.val();
          var now = moment.utc(dt).format("YYYY/MM/DD HH:mm:ss");
          var then = resetData.expiryDate;
          var isBefore = moment(now,"YYYY/MM/DD HH:mm:ss").isBefore(moment(then,"YYYY/MM/DD HH:mm:ss"));
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
            /// generate short link
            createShortLink(pushRef.key).then(resp => {
              console.log("request done");
              /// Send email function
              sendForgotPassEmail(customer.info, resp.shortLink);
              res.json(json_res);
            }).catch(function (error){
              json_res.code = 500;
              json_res.message = "Internal error";
              res.json(json_res);
            });
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

async function createShortLink(tokenId) {
  let response;
  /// get web API key
  var apiKey = await admin.database().ref('configuration/private/webApiKey').once('value');
  if(!apiKey.val()) {
    console.log("error cannot get web api key");
    throw new new CustomError('Error occurred while get web API key');
  }
  console.log("web API Key:", apiKey.val());
  shortlinks = shortlinks + apiKey.val();
  console.log("shortlinks:", shortlinks);

  var options = {
    method: 'POST',
    headers: {'content-type' : 'application/json'},
    uri: shortlinks,
    body: {
      longDynamicLink: `https://ballroomgo.page.link/?link=https://ballroomgo.com/changepass?tokenId=${tokenId}&apn=com.danceframe.ballroomgo&ibi=com.danceframe.ballroomgo`
    },
    json: true // Automatically stringifies the body to JSON
  };

  return request(options);
  /*if(!response) {
    console.log("error with shortlink request");
    throw new new CustomError('Error occurred while requesting shortlink');
  }
  else {
    console.log("succeeded shortlink", response.shortLink);
    return response.shortlink;
  }*/
}

function sendForgotPassEmail(newUser, uri) {
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
      uri: uri
    },
  };
  
  sendgridModule.handler("FORGOTPASS_TEMPLATE", msg).then(rdata => {
    console.log("Email Sent.");
  });
}