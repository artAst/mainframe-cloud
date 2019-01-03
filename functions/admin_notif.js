'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sendgridModule = require('./mail_util');

exports.handler = function(admin_notif) {
	const confRef = admin.database().ref(`configuration/private`);
	// get support email
	confRef.child("error_notify_list").once('value').then(snapshot => {
		var notifyList = snapshot.val();
		console.log(admin_notif.message);
		sendNotifEmail(notifyList, admin_notif.message);
	});
}

function sendNotifEmail(notifyList, message) {
  const msg = {
    to: `${notifyList}`,
    from: 'no-reply@dancesportregistration.com',
    subject: `Ballroom Go App Admin Notification`,
    text: ' ',
    html: `<p><b>Notification: ${message}</b> </p>`,
    templateId: "GENERIC_TEMPLATE",
    substitutions: {
    },
  };
  
  sendgridModule.handler("GENERIC_TEMPLATE", msg);
}