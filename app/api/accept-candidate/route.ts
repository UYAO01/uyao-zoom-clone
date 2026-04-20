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
    const { applicantName, applicantEmail, applicantPhone, jobPosition, companyName } = body;

    if (applicantPhone) {
      await sendSMS(applicantPhone, `HONGERA! UYAO inakujulisha kuwa ombi lako la kazi ya ${jobPosition} kwenye kampuni ya ${companyName} limekubaliwa. Ingia kwenye dashibodi kwa maelezo zaidi.`);
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
        subject: `Hongera! Umekubaliwa kwa nafasi ya ${jobPosition} - ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #16a34a;">Habari ${applicantName},</h2>
            <p>Tunayo furaha kukujulisha kuwa maombi yako kwa nafasi ya <strong>${jobPosition}</strong> katika kampuni ya <strong>${companyName}</strong> yamekubaliwa kikamilifu.</p>
            <p>Tafadhali ingia kwenye dashibodi yako ya UYAO kwa maelezo zaidi na hatua zinazofuata.</p>
            <br/>
            <p>Kila la kheri,<br/>Timu ya UYAO</p>
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
