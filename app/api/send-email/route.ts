
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
    const { email, name, jobPosition, companyName, phone } = await req.json();

    // Tuma SMS (kama namba ya simu ipo)
    if (phone) {
      await sendSMS(phone, `UYAO: Habari ${name}, tumepokea kikamilifu maombi yako ya kazi ya ${jobPosition} katika kampuni ya ${companyName}. Tutawasiliana nawe kwa hatua inayofuata.`);
    }

    // Tuma Email (Kama email ipo)
    if (email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false },
      });

      const mailOptions = {
        from: `"UYAO Opportunities" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Uthibitisho wa Maombi: ${jobPosition} at ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #2563eb;">Habari ${name},</h2>
            <p>Tunapenda kukuthibitishia kuwa tumepokea maombi yako kikamilifu kwa nafasi ya <strong>${jobPosition}</strong> katika kampuni ya <strong>${companyName}</strong>.</p>
            <p>Maombi yako yamehifadhiwa na timu yetu itayapitia hivi karibuni. Iwapo utakidhi vigezo vilivyowekwa, tutawasiliana nawe kwa ajili ya hatua inayofuata (Usaili/Interview).</p>
            <br/><p>Asante kwa kutumia mfumo wetu na tunakutakia kila la kheri!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;">UYAO &bull; Your Gateway to Opportunities</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
    }
    
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}