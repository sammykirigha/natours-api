const nodemailer = require('nodemailer')


const sendEmail = async options => {
    //1.) define the transpoter
 const transporter = nodemailer.createTransport({
     host: process.env.EMAIL_HOST,
     port: process.env.EMAIL_PORT,
     auth: {
         user: process.env.EMAIL_USERNAME,
         password: process.env.EMAIL_PASSWORD
     }

 })
    //2.) activate the options

 const mailOPtions = {
     from: 'dorcis kirigha <dkirigha18@gmail.com>',
     to: options.email,
     subject: options.subject,
     text: options.message,
    //  html:
 }   
    //3.) actually send the email
   await transporter.sendMail(mailOPtions)
}

module.exports = sendEmail