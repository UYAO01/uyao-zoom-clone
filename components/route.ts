import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { recipientEmail, recipientName, senderName, messageText, dashboardLink } = await req.json();

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"UYAO Chats" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `Ujumbe Mpya kutoka kwa ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #2563eb;">Habari ${recipientName},</h2>
          <p>Umepokea ujumbe mpya (chat) kwenye dashibodi yako ya UYAO kutoka kwa <strong>${senderName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; border-radius: 4px; margin: 15px 0; font-style: italic;">
             "${messageText}"
          </div>
          
          <p>Tafadhali ingia kwenye mfumo ili kujibu ujumbe huu kwa haraka:</p>
          <a href="${dashboardLink || 'https://uyao.com/dashboard'}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; font-weight: bold;">Fungua Dashibodi</a>
          
          <br/><br/>
          <p style="font-size: 12px; color: #6b7280;">Huu ni ujumbe wa kujiendesha (automated). Tafadhali usijibu barua pepe hii moja kwa moja.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Chat notification email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending chat notification:', error);
    return NextResponse.json({ error: 'Failed to send chat notification' }, { status: 500 });
  }
}