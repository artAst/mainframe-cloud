'use strict';
const functions = require('firebase-functions');
const request = require('request-promise');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const mailerModule = require('./sendgrid_mailer');
const fbModule = require('./request_fb_info');
const stripeModule = require('./payment_stripe');
const welcomeMailerModule = require('./welcome_mailer');
const invoiceMailerModule = require('./invoice_mailer');

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

const paymentsDBPath = '/stripe_payments/{user_id}/{payment_id}';
const paymentsWebHookURL = 'https://ubersave.useradd.com/dev/SavePayments';
exports.uberSavePayments = functions.database.ref(paymentsDBPath).onWrite(event => {
	const newData = event.data.val();
	const userID = event.params.user_id;
	const paymentID = event.params.payment_id;
	var requestData = 'uid=' + userID + '&pid=' + paymentID + '&pdata=' + JSON.stringify(newData);
	console.log('PAYMENTS requestData: ', requestData);
	
	return request({
		uri: paymentsWebHookURL,
		method: 'POST',
		json: true,
		body: requestData,
		resolveWithFullResponse: true
	}).then(response => {
		if (response.statusCode >= 400) {
			throw new Error(`HTTP Error: ${response.statusCode}`);
		}
		console.log('Payments - SUCCESS! Posted', event.data.ref);
	});  

});

const usersDBPath = '/users/{user_id}';
const usersWebHookURL = 'https://ubersave.useradd.com/dev/SaveUsers';
exports.uberSaveUsers = functions.database.ref(usersDBPath).onWrite(event => {
	const newData = event.data.val();
	const userID = event.params.user_id;
	var requestData = 'uid=' + userID + '&udata=' + JSON.stringify(newData);
	console.log('USERS requestData: ', requestData);
	
	return request({
		uri: usersWebHookURL,
		method: 'POST',
		json: true,
		body: requestData,
		resolveWithFullResponse: true
	}).then(response => {
		if (response.statusCode >= 400) {
			throw new Error(`HTTP Error: ${response.statusCode}`);
		}
		console.log('Users - SUCCESS! Posted', event.data.ref);
	});  

});

exports.welcomeNewUser = functions.auth.user().onCreate(event => {
	const user = event.data;
	console.log("Welcoming new user: " + user.displayName + ", " + user.email);
	return welcomeMailerModule.handler(user);
});

const paymentsChargeDBPath = '/stripe_payments/{user_id}/{payment_id}/charge/amount';
exports.sendPaymentInvoice = functions.database.ref(paymentsChargeDBPath).onCreate(event => {
	const paymentAmount = event.data.val();
	const paymentUserID = event.params.user_id;
	const paymentID = event.params.payment_id;	
	
	return admin.database().ref('/users/' + paymentUserID + '/info').once('value', (snapshot) => {
        var userInfo = snapshot.val();		
		console.log("Sending payment invoice: uid:" + paymentUserID + ", pid:" + paymentID + ", email:" + userInfo.email + ", firstname:" + userInfo.first_name + ", lastname:" + userInfo.last_name + ", amount: " + paymentAmount);
		invoiceMailerModule.handler(userInfo.email, userInfo.first_name + " " + userInfo.last_name, paymentAmount);
     });
});
