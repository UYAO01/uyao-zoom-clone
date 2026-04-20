import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

async function sendSMS(phone: string, message: string) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey || !phone) return;

  let formattedPhone = phone.replace(/[\s-]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+255' + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith('255')) {
    formattedPhone = '+' + formattedPhone;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  try {
    const body = new URLSearchParams({ username, to: formattedPhone, message });
    const response = await fetch(username === 'sandbox' ? 'https://api.sandbox.africastalking.com/version1/messaging' : 'https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: body.toString()
    });
    
    const resultText = await response.text();
    console.log(`Africa's Talking SMS Response kwa ${formattedPhone}:`, resultText);
  } catch (error) {
    console.error('Hitilafu kutuma SMS:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { applicantName, applicantEmail, applicantPhone, jobPosition, companyName, newDate, reason, meetingLink } = body;

    const formattedDate = new Date(newDate).toLocaleString('sw-TZ', { dateStyle: 'full', timeStyle: 'short' });

    if (applicantPhone) {
      await sendSMS(applicantPhone, `UYAO: Usaili wako wa ${jobPosition} (${companyName}) umepangiwa muda mpya: ${formattedDate}. Ingia kwenye dashibodi kwa taarifa zaidi. Sababu: ${reason}`);
    }

    if (applicantEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false },
      });
      
      const mailOptions = {
        from: `"UYAO Opportunities" <${process.env.EMAIL_USER}>`,
        to: applicantEmail,
        subject: `Taarifa Muhimu: Usaili Umepangiwa Muda Mpya - ${jobPosition}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #2563eb;">Habari ${applicantName},</h2>
            <p>Kikao chako cha usaili wa nafasi ya <strong>${jobPosition}</strong> katika kampuni ya <strong>${companyName}</strong> kimepangiwa siku na muda mpya.</p>
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
               <p><strong>Muda Mpya:</strong> ${formattedDate}</p>
               <p><strong>Sababu:</strong> ${reason}</p>
            </div>
            <p>Unaweza kujiunga na usaili huo kupitia link mpya hapa chini pindi muda utakapofika:</p>
            <p><a href="${meetingLink}" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Jiunge na Usaili Mpya</a></p>
            <br/><p>Pole kwa usumbufu wowote uliojitokeza,<br/>Timu ya UYAO</p>
          </div>
        `
      };
      await transporter.sendMail(mailOptions);
    }
    return NextResponse.json({ message: 'Reschedule notifications sent successfully' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}