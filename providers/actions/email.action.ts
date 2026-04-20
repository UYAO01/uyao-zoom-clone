"use server";
import { Resend } from 'resend';

export const sendEmail = async (
  to: string, 
  cc: string, 
  bcc: string, 
  subject: string, 
  text: string
) => {
    if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing from environment variables.');
    console.log('To:', to);
    if (cc) console.log('CC:', cc);
    if (bcc) console.log('BCC:', bcc);
    console.log('Subject:', subject);
    console.log('Body:\n', text);
    console.log('-------------------------------------------');
    // Simulate a short delay to mimic a real API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Mock email sent! (Check server console)' };
  }
 const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    if (!to || !subject || !text) {
      return { success: false, error: 'Missing required fields' };
    }
    
    const { data, error } = await resend.emails.send({
      // NOTE: This 'from' address must be a verified domain in your Resend account.
      // For development, you can use 'onboarding@resend.dev'.
      from: 'UYAO <onboarding@resend.dev>',
      to: to.split(',').map(email => email.trim()),
      cc: cc ? cc.split(',').map(email => email.trim()) : undefined,
      bcc: bcc ? bcc.split(',').map(email => email.trim()) : undefined,
      subject: subject,
      html: text.replace(/\n/g, '<br>'), // Convert newlines to breaks for HTML email
    });
    
    if (error) {
      console.error('Resend API Error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, message: 'Email sent successfully!' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}