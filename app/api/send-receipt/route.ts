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
    console.log(`Africa's Talking SMS Receipt Response kwa ${formattedPhone}:`, resultText);
  } catch (error) {
    console.error('Hitilafu kutuma SMS ya Risiti:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { email, name, phone, amount, currency, description, receiptNumber, date } = await req.json();

    // 1. Tuma SMS kwa mteja (kama namba ya simu ipo)
    if (phone) {
      await sendSMS(phone, `UYAO: Hongera ${name}, tumepokea malipo yako ya ${currency} ${amount} kwa ajili ya ${description}. Risiti No: ${receiptNumber}. Asante!`);
    }

    // Hakikisha Email na Password zipo kwenye .env.local
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('HITILAFU: Taarifa za EMAIL (EMAIL_USER au EMAIL_PASS) hazipo kwenye faili la .env.local');
      return NextResponse.json({ error: 'Email configuration missing' }, { status: 500 });
    }

    // Setup Nodemailer kwa ajili ya Emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    // Hakikisha kama Nodemailer inaweza kuingia kwenye akaunti yako (Verify Connection)
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error("Nodemailer Verification Failed:", verifyError);
      return NextResponse.json({ error: `Imeshindwa kuingia kwenye Email: ${verifyError.message}` }, { status: 500 });
    }

    // 2. Tuma Email ya Risiti kwa Mteja
    if (email) {
      const userMailOptions = {
        from: `"UYAO Payments" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Risiti ya Malipo (Receipt) - ${receiptNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <h2 style="color: #10b981;">Hongera ${name}! Malipo Yamefanikiwa 🎉</h2>
            <p>Tumepokea malipo yako kikamilifu kwenye mfumo wetu. Hapa chini ni maelezo ya risiti yako:</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db;">
              <p><strong>Namba ya Risiti:</strong> ${receiptNumber}</p>
              <p><strong>Kiasi:</strong> ${currency} ${amount.toLocaleString()}</p>
              <p><strong>Maelezo:</strong> ${description}</p>
              <p><strong>Tarehe:</strong> ${new Date(date).toLocaleString('sw-TZ')}</p>
            </div>
            <p>Asante kwa kutumia mfumo wa UYAO!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280; text-align: center;">UYAO &bull; Your Gateway to Opportunities</p>
          </div>
        `,
      };
      await transporter.sendMail(userMailOptions);
    }

    // 3. Tuma Email kwa UYAO System (Kwenye email ya admin) kuwajulisha malipo
    const adminMailOptions = {
      from: `"UYAO System Alerts" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Itatumwa kwenye email ileile ya mfumo (Admin)
      subject: `Malipo Mapya Yamepokelewa - ${currency} ${amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #2563eb;">Taarifa ya Malipo Mapya</h2>
          <p>Mtumiaji amefanya malipo kwenye mfumo. Hapa ni maelezo kamili:</p>
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #bfdbfe;">
            <p><strong>Jina la Mteja:</strong> ${name}</p>
            <p><strong>Email ya Mteja:</strong> ${email || 'N/A'}</p>
            <p><strong>Simu ya Mteja:</strong> ${phone || 'N/A'}</p>
            <p><strong>Kiasi:</strong> ${currency} ${amount.toLocaleString()}</p>
            <p><strong>Maelezo:</strong> ${description}</p>
            <p><strong>Risiti No:</strong> ${receiptNumber}</p>
            <p><strong>Tarehe:</strong> ${new Date(date).toLocaleString('sw-TZ')}</p>
          </div>
        </div>
      `,
    };
    await transporter.sendMail(adminMailOptions);

    return NextResponse.json({ message: 'Receipts sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Hitilafu ya jumla kwenye send-receipt:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}