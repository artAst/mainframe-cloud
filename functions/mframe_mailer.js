/*
 * Main Frame Mailer Function
 *
*/
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

//const gmailEmail = functions.config().gmail.email;
//const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "nanix84@gmail.com",
    pass: "Kitsune101188"
  }
});

const APP_NAME = 'Mainframe Dance System';

exports.handler = function(dance_partner) {
  if(dance_partner != null && dance_partner.email != null && !dance_partner.email != "") {
    sendWelcomeEmail(dance_partner.email, "Art Astillero");
  }
};

// Sends a welcome email to the given user.
function sendWelcomeEmail(email, displayName) {
  const mailOptions = {
    from: `${APP_NAME} <noreply@firebase.com>`,
    to: email
  };

  // The user subscribed to the newsletter.
  mailOptions.subject = `You have been invited to ${APP_NAME}!`;
  mailOptions.text = `Hi ${displayName || ''}! You are added as a dance partner in ${APP_NAME}. I hope you will enjoy our service.`;
  return mailTransport.sendMail(mailOptions).then(() => {
    console.log('New welcome email sent to:', email);
  });
}