const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

const templateRef = admin.database().ref('configuration/private/email_templates');

var SENDGRID_API_KEY = "";
var TEMPLATE_ID = "";

admin.database().ref('configuration/private/sendgridApiKey').once("value", function(data) {
	console.log('MAIL UTIL: SENDGRID_API_KEY retrieved!');
	SENDGRID_API_KEY =  data.val();
}).then( sucess => {	
	sgMail.setApiKey(SENDGRID_API_KEY);
});

exports.handler = async function(template_name, msg) {
	// retrieve template
	await retrieveTemplateId(template_name);
	console.log("TEMPLATE_ID:", TEMPLATE_ID);
	// set template in msg
	msg.templateId = TEMPLATE_ID;
	console.log("MSG:", msg);
	// send email
	return sgMail.send(msg);
}

async function retrieveTemplateId(templateName) {
	TEMPLATE_ID = "";
	await templateRef.orderByChild("templateName").equalTo(templateName).once("value", function(data) {
		var tempData = data.val();
		console.log(`Template ${templateName}: `, tempData);
		for(var templt in tempData) {
			TEMPLATE_ID = tempData[templt].templateId;
		}
	});
}