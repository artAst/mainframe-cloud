var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');

var options = {
  service: 'SendGrid',
  auth: {
    api_user: 'artastillero',
    api_key: 'va*2795V'
  }
}
const APP_NAME = 'Mainframe Dance System';
var client = nodemailer.createTransport(sgTransport(options));

exports.handler = function(dance_partner) {
	if(dance_partner != null && dance_partner.email != null) {
		var email = {
		  from: 'mainframe@dancestudio.com',
		  to: `${dance_partner.email}`,
		  subject: `You have been invited to ${APP_NAME}!`,
		  text: `Hi ${dance_partner.first_name}! You are added as a dance partner in ${APP_NAME}. I hope you will enjoy our service.`,
		  html: `Hi ${dance_partner.first_name}! You are added as a dance partner in ${APP_NAME}. I hope you will enjoy our service.`
		};

		client.sendMail(email, function(err, info){
		    if (err ){
		      console.log(error);
		    }
		    else {
		      console.log('Message sent: ' + info.response);
		    }
		});
	}
}