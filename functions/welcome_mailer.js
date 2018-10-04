const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

const APP_NAME = 'BallroomGo';

var SENDGRID_API_KEY = "";
var WELCOME_TEMPLATE_ID = "";
var WELCOME_EMAIL_ENABLED = "";

admin.database().ref('configuration/private/sendgridApiKey').once("value", function(data) {
	console.log('Getting SENDGRID_API_KEY: ', data.val());
	SENDGRID_API_KEY =  data.val();
}).then( sucess => {	
	sgMail.setApiKey(SENDGRID_API_KEY);
});

admin.database().ref('configuration/private/sendgridWelcomeTemplateId').once("value", function(data) {
	console.log('Getting WELCOME_TEMPLATE_ID: ', data.val());
	WELCOME_TEMPLATE_ID = data.val();
});

admin.database().ref('configuration/private/welcome_email_enable').once("value", function(data) {
	console.log('Getting WELCOME_EMAIL_ENABLED: ', data.val());
	WELCOME_EMAIL_ENABLED = data.val();
})

exports.handler = function(newUser) {
	console.log('In function, using SENDGRID_API_KEY: ', SENDGRID_API_KEY);
	console.log('In function, using WELCOME_TEMPLATE_ID: ', WELCOME_TEMPLATE_ID);
	console.log('In function, using WELCOME_EMAIL_ENABLED: ', WELCOME_EMAIL_ENABLED);
	
	if(newUser != null && newUser.email != null) {
		if(newUser.displayName == null) {
			newUser.displayName = 'there';
		}
		const msg = {
		  to: `${newUser.email}`,
		  from: 'no-reply@dancesportregistration.com',
		  subject: `Welcome to ${APP_NAME}!`,
		  text: ' ',
		  html: '<p> </p>',
		  templateId: WELCOME_TEMPLATE_ID,
		  substitutions: {
			userName: `${newUser.displayName}`,
			},
		};
		return sgMail.send(msg);
	}
}
