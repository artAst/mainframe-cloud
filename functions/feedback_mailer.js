const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const sendgridModule = require('./mail_util');
const moment = require('moment-timezone');
	
const APP_NAME = 'BallroomGo';

var SUPPORT_EMAIL = "";

exports.handler = async function(newFeedbackData) {

	if(newFeedbackData != null) {
		
		if(newFeedbackData.device != null) {
			if(newFeedbackData.device == 'android') {
				await getAndroidSupportEmail();
			} else if(newFeedbackData.device == 'ios') {
				await getIosSupportEmail();
			}
		}		
		
		var feedbackDateString = newFeedbackData.dateSubmitted;
		console.log("dateSubmitted in UTC: " + feedbackDateString);
		var feedbackDate = new Date(feedbackDateString);		
		var timezoneEST = "America/Toronto";
		var standardDateFormat= "YYYY/MM/DD hh:mm a";
		var feedbackDateEST = moment(feedbackDate).tz(timezoneEST).format(standardDateFormat);
		console.log("dateSubmitted in EST: " + feedbackDateEST);
		
		const msg = {
		  to: SUPPORT_EMAIL,
		  from: 'no-reply@dancesportregistration.com',
		  subject: `BallroomGO - Feedback provided: ${newFeedbackData.email}`,
		  text: ' ',
		  html: '<p> </p>',
		  templateId: "FEEDBACK_TEMPLATE_ID",
		  substitutions: {
			dateSubmitted: `${newFeedbackData.dateSubmitted}`,
			appVersion: `${newFeedbackData.app_version}`,
			deviceType: `${newFeedbackData.device}`,
			userEmail: `${newFeedbackData.email}`,
			userId: `${newFeedbackData.id}`,
			feedbackMessage: `${newFeedbackData.message}`,
			},
		  tracking_settings: {
			  click_tracking: {
				  enable: false, 
				  enable_text: false
				  }
			  },
		};
		return sendgridModule.handler("FEEDBACK_TEMPLATE", msg);
	}
}

async function getAndroidSupportEmail() {
	await admin.database().ref('configuration/public/android_support_email').once("value", function(data) {
		console.log('Getting ANDROID SUPPORT_EMAIL: ', data.val());
		SUPPORT_EMAIL = data.val();
	})
}

async function getIosSupportEmail() {
	await admin.database().ref('configuration/public/ios_support_email').once("value", function(data) {
		console.log('Getting IOS SUPPORT_EMAIL: ', data.val());
		SUPPORT_EMAIL = data.val();
	})
}