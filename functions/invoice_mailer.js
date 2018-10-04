var dateTime = require('node-datetime');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

const APP_NAME = 'BallroomGo';

var SENDGRID_API_KEY = "";
var INVOICE_TEMPLATE_ID = "";

admin.database().ref('configuration/private/sendgridApiKey').once("value", function(data) {
	console.log('Getting SENDGRID_API_KEY: ', data.val());
	SENDGRID_API_KEY =  data.val();
}).then( sucess => {	
	sgMail.setApiKey(SENDGRID_API_KEY);
});

admin.database().ref('configuration/private/sendgridInvoiceTemplateId').once("value", function(data) {
	console.log('Getting INVOICE_TEMPLATE_ID: ', data.val());
	INVOICE_TEMPLATE_ID = data.val();
});

exports.handler = function(userEmail, userName, invoiceInfo) {
	console.log('In function, using SENDGRID_API_KEY: ', SENDGRID_API_KEY);
	console.log('In function, using INVOICE_TEMPLATE_ID: ', INVOICE_TEMPLATE_ID);
	
	if(userEmail != null && invoiceInfo != null) {
		if(userName == null) {
			userName = 'there';
		}
		//prepare invoice data
		dateTime.setPeriod([ 'am', 'pm' ]);
		var dt = dateTime.create();
		const invoiceDateTime = dt.format('Y/m/d I:M p');
		const paymentAmount = parseFloat(Math.round(invoiceInfo.totalAmount * 100) / 100).toFixed(2);
		var studioName = userName;
		var studioAddress = '';
		var eventName = '';
		var eventAddress = '';
		if( invoiceInfo.billingInfo.name != null ) {
			studioName = invoiceInfo.billingInfo.name;
		}
		if( invoiceInfo.billingInfo.address != null ) {
			studioAddress = invoiceInfo.billingInfo.address;
		}
		if( invoiceInfo.event.eventTitle != null ) {
			eventName = invoiceInfo.event.eventTitle;
		}
		if( invoiceInfo.event.contact != null ) {
			eventAddress = invoiceInfo.event.contact.address + ' ' + invoiceInfo.event.contact.address2 + '<br />' + invoiceInfo.event.contact.city + ', ' + invoiceInfo.event.contact.province + ' ' + invoiceInfo.event.contact.zip + '<br />' + invoiceInfo.event.contact.country + '<br />Phone' + invoiceInfo.event.contact.phone;
		}
		
		//construct html body for the invoice		
		var invoiceHTMLbody = '';
		var totalInvoiceAmount = 0;
		const invoiceEntries = invoiceInfo.entries;
		if( invoiceEntries != null ) {
			for( var i = 0; i < invoiceEntries.length; i++ ) {
				//list of payments per participant
				invoiceHTMLbody += '<hr /><br /><b><i>Payment summary for:</i> ' + invoiceEntries[i].formName + '</b><br />';
				invoiceHTMLbody += '<table style="border: 0px solid gray;"><tr><td width="300px"><b>Name</b></td><td width="100px"><b>Purchases</b></td><td width="100px"><b>Entries</b></td><td width="50px"><b>#</b></td><td width="150px"><b>Total Purchased</b></td></tr>';
				
				const allParticipantEntries = invoiceEntries[i].participantEntries;
				const allEntryCount = allParticipantEntries.length;
				var allEntryCost = 0;
				var allEntriesText = '';
				for(var j = 0; j < allParticipantEntries.length; j++) {
					allEntryCost += parseFloat(allParticipantEntries[j].price);
					allEntriesText += '<tr><td width="550px">' + allParticipantEntries[j].name + '</td><td width="150px">' + allParticipantEntries[j].price + '</td></tr>'
				}
				
				var allParticipantNames = '';
				const formParticipants = invoiceEntries[i].participants;
				for( var k = 0; k < formParticipants.length; k++ ) {				
					const participantName = formParticipants[k].first_name + ' ' + formParticipants[k].last_name;
					allParticipantNames += participantName + '/';
					var participantEntriesAmount = 0;
					if (k == 0) {
						participantEntriesAmount = allEntryCost;
					}
					invoiceHTMLbody += '<tr><td>' + participantName + '</td><td>0</td><td>' + participantEntriesAmount + '</td><td>' + allEntryCount + '</td><td>' + participantEntriesAmount + '</td></tr>';
				}
				allParticipantNames = allParticipantNames.substring(0, allParticipantNames.length - 1);
				invoiceHTMLbody += '<tr><td><b>Totals</b></td><td>0</td><td>' + allEntryCost + '</td><td>' + allEntryCount + '</td><td>' + allEntryCost + '</td></tr></table><br />';
			
				//list of dance entries
				invoiceHTMLbody += '<b>Entries for: ' + allParticipantNames + '</b><br />';
				invoiceHTMLbody += '<table style="border: 0px solid gray;">';
				invoiceHTMLbody += allEntriesText;
				invoiceHTMLbody += '<tr><td><b>Subtotal</b></td><td>' + allEntryCost + '</td></tr></table><br />';
				totalInvoiceAmount += allEntryCost;
			}
		}
		
		//ticket summary
		var nonPackageText = '';
		const invoiceTickets = invoiceInfo.tickets;
		var ticketCountMap = new Object();
		var ticketCostMap = new Object();
		var allNonPackageTotal = 0;		
		if( invoiceTickets != null ) {
			for( var i = 0; i < invoiceTickets.length; i++ ) {
				if ( ticketCountMap[invoiceTickets[i].content] != null ) {
					ticketCountMap[invoiceTickets[i].content] = ticketCountMap[invoiceTickets[i].content] + 1;
				} else {
					ticketCountMap[invoiceTickets[i].content] = 1;
					ticketCostMap[invoiceTickets[i].content] = invoiceTickets[i].amount
				}
			}
			for (oneTicketIndex in ticketCountMap) {
				const ticketSubtotal = parseFloat(ticketCostMap[oneTicketIndex]) * parseFloat(ticketCountMap[oneTicketIndex]);
				allNonPackageTotal += ticketSubtotal;
				nonPackageText += '<tr><td width="100px">Ticket</td><td width="300px">' + oneTicketIndex + '</td><td width="50px">' + ticketCostMap[oneTicketIndex] + '</td><td width="50px">' + ticketCountMap[oneTicketIndex] + '</td><td width="100px">' + ticketSubtotal.toFixed(2) + '</td></tr>';				
			}
			totalInvoiceAmount += allNonPackageTotal;
		}
		//surcharge info
		const invoiceSurcharge = invoiceInfo.surcharge;
		if( invoiceSurcharge != null ) {
			//const surchargeAmount = parseFloat(Math.round(invoiceSurcharge.amount * 100) / 100);
			//tweak to avoid round-off errors
			const surchargeAmount = parseFloat(paymentAmount) - parseFloat(totalInvoiceAmount);
			nonPackageText += '<tr><td width="400px" colspan="2">' + invoiceSurcharge.description + '</td><td width="50px">' + surchargeAmount.toFixed(2) + '</td><td width="50px">1</td><td width="100px">' + surchargeAmount.toFixed(2) + '</td></tr>';
			allNonPackageTotal += surchargeAmount;
		}		
		
		//Non-package purchases
		invoiceHTMLbody += '<hr /><br /><b>Non-package Purchases</b><br />';
		invoiceHTMLbody += '<table style="border: 0px solid gray;"><tr><td width="100px"><b>Item</b></td><td width="300px"><b>Description</b></td><td width="100px"><b>Unit Price</b></td><td width="50px"><b>Quantity</b></td><td width="100px"><b>Subtotal</b></td></tr>';
		invoiceHTMLbody += nonPackageText;
		invoiceHTMLbody += '<tr><td width="100px"><b>Totals</b></td><td width="300px">  </td><td width="50px">  </td><td width="50px">  </td><td width="100px">' + allNonPackageTotal.toFixed(2) + '</td></tr></table>';
		
		
		const msg = {
		  to: `${userEmail}`,
		  bcc: 'nbonita@useradd.com',
		  from: 'no-reply@dancesportregistration.com',
		  subject: `Payment invoice - ${APP_NAME}!`,
		  text: ' ',
		  html: '<p>' + invoiceHTMLbody + '</p>',
		  templateId: INVOICE_TEMPLATE_ID,
		  substitutions: {
			userName: `${studioName}`,
			invoiceDateTime: `${invoiceDateTime}`,
			paymentAmount: `${paymentAmount}`,
			userAddress: `${studioAddress}`,
			eventName: `${eventName}`,
			eventAddress: `${eventAddress}`,
			},
		};
		return sgMail.send(msg);
	}
}
