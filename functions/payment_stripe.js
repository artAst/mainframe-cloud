'use strict';

const functions = require('firebase-functions'),
      admin = require('firebase-admin'),
      logging = require('@google-cloud/logging')();

const currency = functions.config().stripe.currency || 'USD';

exports.handler = function(event) {
	const val = event.data.val();
	const paymentId = event.params.paymentId;
	const userId = event.params.userId;
	
	// This onWrite will trigger whenever anything is written to the path, so
	// noop if the charge was deleted, errored out, or the Stripe API returned a result (id exists) 
	if (val === null || val.id || val.error) return null;
	return admin.database().ref(`/configuration/stripeSK`).once('value').then(snapshot => {
		console.log('stripe key retrieved: ' + snapshot.val());
		return snapshot.val();
	}).then(stripeKey => {
		const stripe = require('stripe')(stripeKey);
		// Look up the Stripe customer id written in createStripeCustomer
		return admin.database().ref(`/users/${userId}`).once('value').then(snapshot => {
			console.log('entered users');
			return snapshot.val();
		}).then(customer => {
			// Create a charge using the pushId as the idempotency key, protecting against double charges 
			const amount = val.amount;
			const idempotency_key = event.params.paymentId;
			const source = val.tokenId;
			let charge = {amount, currency, source};
			console.log(`charging request: $amount  and token: $source`);
			return stripe.charges.create(charge, {idempotency_key});
		}).then(response => {
		  // If the result is successful, write it back to the database
		  return admin.database()
		  				.ref(`/stripe_payments/${userId}/${paymentId}/charge`)
		  				.set(response);
		}, error => {
		  // We want to capture errors and render them in a user-friendly way, while
		  // still logging an exception with Stackdriver
		  console.log('stripe error message', error.message);
		  //console.log('stripe error:', error);
		  return admin.database()
		  				.ref(`/stripe_payments/${userId}/${paymentId}/error`)
		  				.set({
		  					"message": error.message,
		  					"type": error.type
		  				});
		});
	}, error => {
		  // We want to capture errors and render them in a user-friendly way, while
		  // still logging an exception with Stackdriver
		  console.log('stripe error message', error.message);
		  //console.log('stripe error:', error);
		  return admin.database()
		  				.ref(`/stripe_payments/${userId}/${paymentId}/error`)
		  				.set({
		  					"message": error.message,
		  					"type": error.type
		  				});
	});
}