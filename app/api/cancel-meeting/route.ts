import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Function ya Kutuma SMS kupitia Africa's Talking
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
    const { applicantName, applicantEmail, applicantPhone, employerPhone, jobPosition, companyName, cancelReason } = body;

    if (applicantPhone) {
      await sendSMS(applicantPhone, `UYAO: Tunasikitika usaili wa nafasi ya ${jobPosition} (${companyName}) umesitishwa. Kama ulilipia, ingia kwenye dashibodi kuomba refund.`);
    }

    if (employerPhone) {
      await sendSMS(employerPhone, `UYAO: Umetozwa faini ya TZS 10,000 kwa kusitisha usaili wa ${applicantName} bila sababu/reschedule. Ingia kwenye mfumo kwa taarifa zaidi.`);
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
        subject: `Taarifa Muhimu: Usaili Umesitishwa - ${jobPosition}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #dc2626;">Habari ${applicantName},</h2>
            <p>Tunasikitika kukujulisha kuwa usaili wako uliopangwa kwa ajili ya nafasi ya <strong>${jobPosition}</strong> katika kampuni ya <strong>${companyName}</strong> umesitishwa.</p>
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
               <p><strong>Sababu:</strong> ${cancelReason || 'Haijatajwa'}</p>
            </div>
            <p>Kama ulilipia usaili huu, tafadhali ingia kwenye dashibodi yako ili kuomba kurudishiwa pesa (Refund).</p>
            <br/><p>Pole kwa usumbufu,<br/>Timu ya UYAO</p>
          </div>
        `
      };
      await transporter.sendMail(mailOptions);
    }
    return NextResponse.json({ message: 'Acceptance notifications sent successfully' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to send acceptance notifications' }, { status: 500 });
  }
}