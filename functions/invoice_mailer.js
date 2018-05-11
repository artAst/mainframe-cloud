const sgMail = require('@sendgrid/mail');
const SENDGRID_API_KEY = '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'
const INVOICE_TEMPLATE_ID = 'cac49fb9-5c0c-4139-830f-57eb13a48724'
const APP_NAME = 'Mainframe Dance System';

sgMail.setApiKey(SENDGRID_API_KEY);

exports.handler = function(userEmail, userName, paymentAmount) {
	if(userEmail != null && paymentAmount != null) {
		if(userName == null) {
			userName = 'there';
		}
		const msg = {
		  to: `${userEmail}`,
		  from: 'no-reply@dancesportregistration.com',
		  subject: `Payment invoice - ${APP_NAME}!`,
		  text: ' ',
		  html: '<p> </p>',
		  templateId: INVOICE_TEMPLATE_ID,
		  substitutions: {
			userName: `${userName}`,
			paymentAmount: `${paymentAmount}`,
			},
		};
		return sgMail.send(msg);
	}
}