const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const sendgridModule = require('./mail_util');

const APP_NAME = 'BallroomGo';

exports.handler = async function(newUser) {

	if(newUser != null && newUser.email != null) {
		if(newUser.displayName == null) {
			newUser.displayName = '';
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