const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const sendgridModule = require('./mail_util');

const APP_NAME = 'BallroomGo';

var WELCOME_EMAIL_ENABLED = "";

exports.handler = async function(newUser) {
	await getWelcomeEnabledConfig();

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
		  templateId: "WELCOME_TEMPLATE_ID",
		  substitutions: {
			userName: `${newUser.displayName}`,
			},
		};
		return sendgridModule.handler("WELCOME_TEMPLATE", msg);
	}
}

async function getWelcomeEnabledConfig() {
	await admin.database().ref('configuration/private/welcome_email_enable').once("value", function(data) {
		console.log('Getting WELCOME_EMAIL_ENABLED: ', data.val());
		WELCOME_EMAIL_ENABLED = data.val();
	})
}