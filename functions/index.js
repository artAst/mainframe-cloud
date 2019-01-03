'use strict';
const functions = require('firebase-functions');
const request = require('request-promise');
const moment = require('moment-timezone');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();

var serviceAccount = require("./uberregister-5308a-firebase-adminsdk-cvq31-cc7bff5bf3.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://uberregister-5308a.firebaseio.com"
});

const mailerModule = require('./sendgrid_mailer');
const fbModule = require('./request_fb_info');
const stripeModule = require('./payment_stripe');
const forgotpassModule = require('./forgotpass');
const changepassModule = require('./changepass');
const welcomeMailerModule = require('./welcome_mailer');
const invoiceMailerModule = require('./invoice_mailer');
const feedbackMailerModule = require('./feedback_mailer');
const newUserNotifyMailerModule = require('./new_user_notify_mailer');
const adminNotifModule = require('./admin_notif');

const usersDBPath = '/users/{user_id}';
const usersWebHookURL = 'https://ubersave.useradd.com/dev/SaveUsers';

app.use(cors);
// to be used in changepass
app.use(express.json());
// Forgot Password HTTP Request
app.get('/forgotpass/:email', (req, res) => {
  return forgotpassModule.handler(req, res);
});
// Change Password HTTP Request
app.post('/changepass', (req, res) => {
  return changepassModule.handler(req, res);
});

exports.app = functions.https.onRequest(app);

//exports.app = functions.https.onRequest(firebaseAuth.app);
const dbListenPath = '/users/{userId}/dance_partners/{pushId}';
exports.sendMail = functions.database.ref(dbListenPath).onCreate((snap, context) => {
  const dance_partner = snap.val();
  console.log(dance_partner.first_name);
  mailerModule.handler(dance_partner);
  return snap.ref.set(dance_partner);
});

const fbRequestPath = '/users/{userId}/fb_tokens/fbToken';
exports.fbPullInfo = functions.database.ref(fbRequestPath).onCreate((snap, context) => {
	const fbToken = snap.val();
	const uid = context.params.userId;
	console.log("token: "+fbToken);
	fbModule.handler(fbToken, uid);
	return snap.ref.set(fbToken);
});

const notifPath = '/admin_notification/{pushId}';
exports.adminNotif = functions.database.ref(notifPath).onCreate((snap, context) => {
  const admin_notification = snap.val();
  console.log(admin_notification.email);
  adminNotifModule.handler(admin_notification);
  return snap.ref.set(admin_notification);
});

exports.createStripeCharge = functions.database.ref('/stripe_payments/{userId}/{paymentId}').onWrite((change, context) => {
  return stripeModule.handler(change, context);
});

exports.deleteUserItems = functions.auth.user().onDelete((user) => {  
  const userID = user.uid;
  var requestData = 'ubersave_uid=' + userID + '&ubersave_udata=null';
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
		console.log("DELETING USER: " + userID);
		admin.database().ref(`/users/${user.uid}`).remove();
	});
});

const paymentsDBPath = '/stripe_payments/{user_id}/{payment_id}';
const paymentsWebHookURL = 'https://ubersave.useradd.com/dev/SavePayments';
exports.uberSavePayments = functions.database.ref(paymentsDBPath).onWrite((change, context) => {
	const newData = change.after.val();
	const userID = context.params.user_id;
	const paymentID = context.params.payment_id;
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


exports.uberSaveUsers = functions.database.ref(usersDBPath).onWrite((change, context) => {
	const newData = change.after.val();	
	
	if((newData != null) && (newData.info != null) && (newData.info.hasProfileSetup != null)) {		
		if(newData.info.hasProfileSetup == true) {
			const userID = context.params.user_id;
			var requestData = 'ubersave_uid=' + userID + '&ubersave_udata=' + JSON.stringify(newData);
			console.log('SENDING DATA TO uberSave: ', requestData);
			
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
				console.log('SENDING OUT NOTIFY EMAIL...');
				console.log('USER OBJECT FOR NOTIFY: ', newData);
				newUserNotifyMailerModule.handler(userID, newData);				
			});
		}
	}

	return 'ok';

});

exports.welcomeNewUser = functions.auth.user().onCreate((userRecord, context) => {
	const user = userRecord;	
	const userID = user.uid;
	const userEmail = user.email;
	const firstName = user.displayName;
	const dateCreated = user.metadata.creationTime;
	const lastSignIn = user.metadata.lastSignInTime;
	var loginProvider = "Email";
	var loginProviderUID = "";	
	var dateCreatedEST = "";
	var lastSignInEST = "";
		
	if( user.providerData[0] != null ) {
		if( user.providerData[0].providerId != null ) {
			loginProvider = user.providerData[0].providerId;
			loginProviderUID = user.providerData[0].uid;
		}
	}
	
	if( (dateCreated != null ) && (lastSignIn != null ) ) {
		console.log("REFORMATING USER LOGIN/SIGNUP DATES INTO EST...");
		var dateCreatedDate = new Date(dateCreated);
		var timezoneEST = "America/Toronto";
		var standardDateFormat= "YYYY-MM-DD HH:mm:ss";
		dateCreatedEST = moment(dateCreatedDate).tz(timezoneEST).format(standardDateFormat);
		var lastSignInDate = new Date(lastSignIn);
		lastSignInEST = moment(lastSignInDate).tz(timezoneEST).format(standardDateFormat);
		console.log("dateCreatedEST: " + dateCreatedEST);
		console.log("lastSignInEST: " + lastSignInEST);
	}
		
	var requestData = 'ubersave_uid=' + userID + '&ubersave_udata=' + '{"info":{"email":"'+ userEmail+'","first_name":"'+firstName+'","date_created":"'+dateCreatedEST+'","date_signedin":"'+lastSignInEST+'","login_provider":"'+loginProvider+'"}}';
	console.log("requestData: " + requestData);
	
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
		console.log("Welcoming new user: " + JSON.stringify(user));
		welcomeMailerModule.handler(user);
	});
});

const paymentsInvoiceInfoPath = '/stripe_payments/{user_id}/{payment_id}/invoiceInfo';
exports.sendPaymentInvoice = functions.database.ref(paymentsInvoiceInfoPath).onCreate((snap, context) => {
	const invoiceInfo = snap.val();
	const paymentUserID = context.params.user_id;
	const paymentID = context.params.payment_id;	
	
	return admin.database().ref('/users/' + paymentUserID + '/info').once('value', (snapshot) => {
        var userInfo = snapshot.val();		
		console.log("Sending payment invoice: uid:"+paymentUserID+", pid:"+paymentID+", email:"+userInfo.email+", firstname:"+userInfo.first_name+", lastname:"+userInfo.last_name+", invoice_info: "+invoiceInfo);
		invoiceMailerModule.handler(userInfo.email, userInfo.first_name + " " + userInfo.last_name, invoiceInfo);
     });
});

const feedbackDBPath = '/feedbacks/{feedback_id}';
exports.newFeedbackEmail = functions.database.ref(feedbackDBPath).onWrite((change, context) => {
	const newFeedbackData = change.after.val();	
	console.log("New feedback added: " + JSON.stringify(newFeedbackData));
	return feedbackMailerModule.handler(newFeedbackData);
});