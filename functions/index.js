'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const mailerModule = require('./sendgrid_mailer');
const fbModule = require('./request_fb_info');
//const mailerModule = require('./mframe_mailer');
//const firebaseAuth = require('./mframe_auth');
//const authTestModule = require('./testAuth');

/*exports.testAuthEmail = functions.https.onRequest((request, response) => {
  authTestModule.handler(request, response);
});
exports.sendMFEmail = functions.https.onRequest((request, response) => {
  mailerModule.handler(request, response);
});*/

//exports.app = functions.https.onRequest(firebaseAuth.app);
const dbListenPath = '/users/{userId}/dance_partners/{pushId}';
exports.sendMail = functions.database.ref(dbListenPath).onCreate(event => {
  const dance_partner = event.data.val();
  console.log(dance_partner.first_name);
  mailerModule.handler(dance_partner);
  return event.data.ref.set(dance_partner);
});

const fbRequestPath = '/fb_tokens/{userId}/fbToken';
exports.fbPullInfo = functions.database.ref(fbRequestPath).onCreate(event => {
	const fbToken = event.data.val();
	const uid = event.params.userId;
	console.log("token: "+fbToken);
	fbModule.handler(fbToken, uid);
	return event.data.ref.set(fbToken);
});
/*exports.testFBReq = functions.https.onRequest((request, response) => {
  fbModule.handler(request, response);
});*/