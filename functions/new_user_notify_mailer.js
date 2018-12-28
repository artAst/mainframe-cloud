const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const sendgridModule = require('./mail_util');
const moment = require('moment-timezone');

const APP_NAME = 'BallroomGo';

var NEW_USER_NOTIFY_EMAIL = "";

exports.handler = async function(newUserId, newUserData) {

	await getNewUserNotifyEmail();

	if(newUserData != null && newUserData.info.email != null) {
		var dateCreated = "";
		var lastSignIn = "";
		var dateCreatedEST = "";
		var lastSignInEST = "";
		var loginProvider = "Email";	
		var userBirthday = "";
		
		if(newUserData.info.birthday != null) {
			var recipientArray = newUserData.info.birthday.split("/");
			if(recipientArray.length >= 3) {
				userBirthday = recipientArray[2] + "/" + recipientArray[0] + "/" + recipientArray[1];
			}
		}
		
		await admin.auth().getUser(newUserId)
		  .then(function(userRecord) {
			// See the UserRecord reference doc for the contents of userRecord.
			console.log("NEW_USER_NOTIFY_EMAIL: Successfully fetched user data:", userRecord.toJSON());
			if( userRecord.providerData[0] != null ) {
			  if( userRecord.providerData[0].providerId != null ) {
				
				dateCreated = userRecord.metadata.creationTime;
				var dateCreatedDate = new Date(dateCreated);
				var timezoneEST = "America/Toronto";
				var standardDateFormat= "YYYY/MM/DD hh:mm a";
				dateCreatedEST = moment(dateCreatedDate).tz(timezoneEST).format(standardDateFormat);
				
				lastSignIn = userRecord.metadata.lastSignInTime;
				var lastSignInDate = new Date(lastSignIn);
				lastSignInEST = moment(lastSignInDate).tz(timezoneEST).format(standardDateFormat);
		
			    loginProvider = userRecord.providerData[0].providerId;
			  }
			}
		  })
		  .catch(function(error) {
			console.log("NEW_USER_NOTIFY_EMAIL: Error fetching user data:", error);
		  });
  
		const msg = {
		  from: 'no-reply@dancesportregistration.com',
		  subject: `BallroomGO - New user: ${newUserData.info.email}`,
		  text: ' ',
		  html: '<p> </p>',
		  templateId: "NEW_USER_NOTIFY_TEMPLATE_ID",
		  substitutions: {
			userId: `${newUserId}`,
			userEmail: `${newUserData.info.email}`,
			firstName: `${newUserData.info.first_name}`,
			lastName: `${newUserData.info.last_name}`,
			userGender: `${newUserData.info.gender}`,
			userBirthday: `${userBirthday}`,
			userCategory: `${newUserData.info.category}`,
			appVersion: `${newUserData.info.appVersion}`,
			devicePlatform: `${newUserData.info.devicePlatform}`,
			dateCreated: `${dateCreatedEST}`,
			lastSignIn: `${lastSignInEST}`,
			loginProvider: `${loginProvider}`,
			},
		};
		
		//check if there are multiple recipients		
		var recipientArray = NEW_USER_NOTIFY_EMAIL.split(",");
		if(recipientArray.length > 1) {			
			var recipientJsonArray = [];
			recipientArray.forEach(function (oneRecipient) {
				var oneRecipientJson = {"email": oneRecipient};
				recipientJsonArray.push(oneRecipientJson);
				console.log("ONE OF MULTIPLE NEW_USER_NOTIFY RECIPIENT: " + oneRecipient);
			});
			msg.personalizations = [{"to": recipientJsonArray}]
		} else {
			msg.to = NEW_USER_NOTIFY_EMAIL;
		}
		
		return sendgridModule.handler("NEW_USER_NOTIFY", msg);
	}
}

async function getNewUserNotifyEmail() {
	await admin.database().ref('configuration/private/nu_notify_list').once("value", function(data) {
		console.log('Getting NEW_USER_NOTIFY_EMAIL: ', data.val());
		NEW_USER_NOTIFY_EMAIL = data.val();
	})
}
