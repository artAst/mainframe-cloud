'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const mailerModule = require('./sendgrid_mailer');
const fbModule = require('./request_fb_info');
const stripeModule = require('./payment_stripe');

//exports.app = functions.https.onRequest(firebaseAuth.app);
const dbListenPath = '/users/{userId}/dance_partners/{pushId}';
exports.sendMail = functions.database.ref(dbListenPath).onCreate(event => {
  const dance_partner = event.data.val();
  console.log(dance_partner.first_name);
  mailerModule.handler(dance_partner);
  return event.data.ref.set(dance_partner);
});

const fbRequestPath = '/users/{userId}/fb_tokens/fbToken';
exports.fbPullInfo = functions.database.ref(fbRequestPath).onCreate(event => {
	const fbToken = event.data.val();
	const uid = event.params.userId;
	console.log("token: "+fbToken);
	fbModule.handler(fbToken, uid);
	return event.data.ref.set(fbToken);
});

exports.createStripeCharge = functions.database.ref('/stripe_payments/{userId}/{paymentId}').onWrite(event => {
  return stripeModule.handler(event);
});

exports.deleteUserItems = functions.auth.user().onDelete(event => {
  return admin.database().ref(`/users/${event.data.uid}`).remove();
});