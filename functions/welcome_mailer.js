const sgMail = require('@sendgrid/mail');
const SENDGRID_API_KEY = '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'
const WELCOME_TEMPLATE_ID = '6b5da578-706c-4fa4-9a3e-a037447a1294'
const APP_NAME = 'Mainframe Dance System';

sgMail.setApiKey(SENDGRID_API_KEY);

exports.handler = function(newUser) {
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