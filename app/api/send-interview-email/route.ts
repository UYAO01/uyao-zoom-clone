import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email, name, jobPosition, companyName, interviewDate, interviewLink } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'No applicant email' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    const formattedDate = new Date(interviewDate).toLocaleString('sw-TZ', { dateStyle: 'full', timeStyle: 'short' });

    const mailOptions = {
      from: `"UYAO Interviews" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Mwaliko wa Usaili (Interview Invitation) - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px;">
          <h2 style="color: #2563eb;">Habari ${name},</h2>
          <p>Hongera! Maombi yako ya kazi kwa nafasi ya <strong>${jobPosition}</strong> katika kampuni ya <strong>${companyName}</strong> yamepita hatua ya awali, na umepangiwa usaili (Interview).</p>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #bfdbfe;">
             <p><strong>Tarehe na Muda:</strong> ${formattedDate}</p>
             <p><strong>Link ya Kujiunga:</strong> <a href="${interviewLink}" style="color: #2563eb;">Bonyeza Hapa Kujiunga</a></p>
          </div>
          <p>Tafadhali ingia kwenye mfumo (Dashibodi yako ya UYAO) ili kukamilisha malipo ya usaili (TZS 5,000) kabla ya muda wa kikao kuanza, ili uweze kupata ruhusa ya kujiunga.</p><br/><p>Kila la kheri katika usaili wako!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" /><p style="font-size: 12px; color: #6b7280;">UYAO &bull; Your Gateway to Opportunities</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
  } catch { return NextResponse.json({ error: 'Failed to send email' }, { status: 500 }); }
}
