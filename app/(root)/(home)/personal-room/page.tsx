/* eslint-disable @next/next/no-img-element */
'use client';
import { BookOpen, Briefcase, Check, Landmark, LucideIcon, Users, Calendar, FileText, UserCog, X, Search, ChevronRight, PhoneCall, MousePointerClick, Send, MapPin, AlertTriangle, Gavel, DoorOpen, ChevronLeft, Eye, Edit, MoreVertical, Filter, Trash, Clock, LogIn, LogOut, Receipt, GraduationCap, Bell, Archive, FileSignature, ShieldAlert, Scale, TrendingDown, HeartPulse, Banknote, Truck, Award, UserMinus, Handshake, FileCheck, CheckCircle2, Lock, ClipboardList, BarChart } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import MeetingModal from '@/components/MeetingModal';
// Mpya: Imports kwa ajili ya kutengeneza PDF
import { jsPDF } from 'jspdf';
import html2canvas, { Options } from 'html2canvas-pro';
import { useStreamVideoClient, Call } from '@stream-io/video-react-sdk';
import ReactDatePicker from 'react-datepicker';
import { db, firebaseStorage } from '@/components/ui/firebase';

import 'react-datepicker/dist/react-datepicker.css';
import { Textarea } from '@/src/components/ui/textarea';
import PostJobForm from '@/components/PostJobForm'; // Import the new component

// Mpya: Import ya React Quill kwa ajili ya MS Word/WPS style editor
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

type Plan = {
  title: string;
  description: string;
  price: number | null;
  priceDisplay: string;
  currency: string | null;
  benefits: string[];
  planId: string;
  icon: LucideIcon;
};

type Job = {
  id: string;
  companyName: string;
  jobPosition: string;
  description: string;
  qualifications: string[]; // Imebadilishwa kutoka string kwenda string array
  jobType: string; // Mpya: Aina ya kazi
  deadline: string;
  logoUrl?: string;
  teamImageUrl?: string; // Mpya: Picha ya Timu/Mandhari
  contactPhone?: string; // Mpya: Namba ya Simu ya Mawasiliano
  companyAddress?: string; // Mpya: Anuani ya Kampuni
  createdBy?: string;
  expiryNotified?: boolean; // Mpya: Kufuatilia kama amepewa taarifa ya muda kuisha
};

type Application = {
  id: string;
  jobId: string;
  jobPosition: string;
  companyName: string;
  cvUrl: string;
  cvText?: string; // Mpya: CV iliyoandaliwa moja kwa moja kwenye mfumo
  linkedInUrl?: string; // Mpya: Link ya LinkedIn ya mwombaji
  coverLetter: string;
  appliedAt: string;
  applicantId: string; // Mpya: ID ya mtumiaji aliyetuma maombi
  applicantName?: string; // Mpya: Jina la mwombaji
  applicantEmail?: string; // Mpya: Email ya mwombaji
  applicantAddress?: string; // Mpya: Anuani ya mwombaji
  applicantPhone?: string; // Mpya: Namba ya simu ya mwombaji
  interviewScheduled?: boolean; // Mpya: Kama interview imeratibiwa
  interviewDate?: string; // Mpya: Tarehe na muda wa interview (ISO string)
  interviewExpiresAt?: string; // Mpya: Muda wa interview kuisha
  interviewPaid?: boolean; // Mpya: Kama mwombaji amelipia interview
  interviewLink?: string; // Mpya: Link ya mkutano wa interview
  interviewerName?: string; // Mpya: Jina la aliyeratibu interview
  interviewerEmail?: string; // Mpya: Email ya muandaaji kikao
  signatureUrl?: string; // Mpya: E-Signature ya mwombaji
  isRead?: boolean; // Mpya: Kufuatilia kama ombi limesomwa
  interviewCanceled?: boolean; // Mpya: Kama interview imecanceliwa
  cancelReason?: string; // Mpya: Sababu ya kucancel
  penaltyApplied?: boolean; // Mpya: Kama faini imetozwa
  penaltyAppliedAt?: string; // Mpya: Siku faini imetozwa
  rescheduleRequested?: boolean; // Mpya: Ombi la kupangiwa siku mpya
  rescheduleReason?: string; // Mpya: Sababu ya reschedule (No-Show)
  interviewerPenaltyPending?: boolean; // Mpya: Hali ya faini kwa interviewer
  isAccepted?: boolean; // Mpya: Kama ombi limekubaliwa kikamilifu
  penaltyPaid?: boolean; // Mpya: Kama faini imeshalipwa
  refundRequested?: boolean; // Mpya: Kama ameomba refund
  refundMethod?: string; // Mpya: Njia ya refund (account au subscription)
  refundAccountDetails?: string; // Mpya: Maelezo ya akaunti
  refundRequestedAt?: string; // Mpya: Muda aliomba refund
  attachments?: { name: string; url: string }[]; // Mpya: Kwa ajili ya vyeti nk
  employeeDepartment?: string; // Mpya: Kwa directory
  employeeStatus?: string; // Mpya: Kwa directory
  employeeRole?: string; // Mpya: Kwa directory
};

// Mpya: Type ya Employee itakayotumika kwenye mfumo
type Employee = {
  id: string;
  appId: string;
  employerId: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  empId: string;
  role: string;
  department: string;
  status: string;
  joinedAt: string;
};

type DisciplinaryCase = {
  id: string;
  employerId: string;
  employeeAppId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeeDept: string;
  employeeAvatar: string;
  caseNumber: string;
  step: number;
  createdAt: string;
  updatedAt: string;
  documents: { title: string; url: string; date: string; type: string }[];
  wsodUploaded?: boolean;
};

const LOCATION_DATA: Record<string, string[]> = {
  'Tanzania': ['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba Kaskazini', 'Pemba Kusini', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Unguja Kaskazini', 'Unguja Kusini', 'Mjini Magharibi'],
  'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Mkoa Mwingine'],
  'Uganda': ['Kampala', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mkoa Mwingine'],
  'Rwanda': ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Mkoa Mwingine'],
  'Burundi': ['Bujumbura', 'Gitega', 'Ngozi', 'Mkoa Mwingine'],
  'Nchi Nyingine': ['Mkoa Mwingine']
};

const COUNTRY_DIAL_CODES: Record<string, string> = {
  'Tanzania': '🇹🇿 +255',
  'Kenya': '🇰🇪 +254',
  'Uganda': '🇺🇬 +256',
  'Rwanda': '🇷🇼 +250',
  'Burundi': '🇧🇮 +257',
  'Nchi Nyingine': '🏳️ +000'
};

// Mpya: Function ya kutafuta picha kulingana na aina ya kazi
const getFallbackImage = (position: string) => {
  const pos = (position || '').toLowerCase();
  if (pos.includes('software') || pos.includes('developer') || pos.includes('tech') || pos.includes('data') || pos.includes('it ') || pos === 'it') {
    return 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80'; // Tech
  } else if (pos.includes('afya') || pos.includes('health') || pos.includes('doctor') || pos.includes('nurse') || pos.includes('medical') || pos.includes('daktari')) {
    return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80'; // Health
  } else if (pos.includes('market') || pos.includes('masoko') || pos.includes('sales') || pos.includes('mauzo') || pos.includes('biashara')) {
    return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80'; // Marketing
  } else if (pos.includes('finance') || pos.includes('fedha') || pos.includes('accountant') || pos.includes('mhasibu') || pos.includes('bank')) {
    return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80'; // Finance
  } else if (pos.includes('teach') || pos.includes('mwalimu') || pos.includes('education') || pos.includes('elimu') || pos.includes('shule')) {
    return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80'; // Education
  } else if (pos.includes('kilimo') || pos.includes('agriculture') || pos.includes('farm') || pos.includes('mifugo') || pos.includes('agri')) {
    return 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80'; // Agriculture
  } else if (pos.includes('uhandisi') || pos.includes('engineer') || pos.includes('construction') || pos.includes('mechanic') || pos.includes('civil') || pos.includes('technician')) {
    return 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80'; // Engineering
  }
  // Picha ya Default kwa kazi nyingine zote
  return 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80'; 
};

// Mpya: Function ya kutafuta rangi na theme ya CV kulingana na kazi
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getJobTheme = (position: string) => {
  const pos = (position || '').toLowerCase();
  if (pos.includes('software') || pos.includes('developer') || pos.includes('tech') || pos.includes('data') || pos.includes('it ') || pos === 'it') {
    return { color: '#0ea5e9', bg: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('afya') || pos.includes('health') || pos.includes('doctor') || pos.includes('nurse') || pos.includes('medical') || pos.includes('daktari')) {
    return { color: '#10b981', bg: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('market') || pos.includes('masoko') || pos.includes('sales') || pos.includes('mauzo') || pos.includes('biashara')) {
    return { color: '#f59e0b', bg: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('finance') || pos.includes('fedha') || pos.includes('accountant') || pos.includes('mhasibu') || pos.includes('bank')) {
    return { color: '#8b5cf6', bg: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('teach') || pos.includes('mwalimu') || pos.includes('education') || pos.includes('elimu') || pos.includes('shule')) {
    return { color: '#f43f5e', bg: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('kilimo') || pos.includes('agriculture') || pos.includes('farm') || pos.includes('mifugo') || pos.includes('agri')) {
    return { color: '#84cc16', bg: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=80' };
  } else if (pos.includes('uhandisi') || pos.includes('engineer') || pos.includes('construction') || pos.includes('mechanic') || pos.includes('civil') || pos.includes('technician')) {
    return { color: '#eab308', bg: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80' };
  }
  return { color: '#3b82f6', bg: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80' };
};

// Mpya: Orodha ya Templates 10 Tofauti za CV
const CV_TEMPLATES = [
  { id: 1, name: 'Modern Left', color: '#2563eb' },
  { id: 2, name: 'Classic Exec', color: '#1f2937' },
  { id: 3, name: 'Elegant Right', color: '#0ea5e9' },
  { id: 4, name: 'Minimalist', color: '#10b981' },
  { id: 5, name: 'Creative Bold', color: '#8b5cf6' },
  { id: 6, name: 'Corporate Tone', color: '#f59e0b' },
  { id: 7, name: 'Tech Dark', color: '#0f172a' },
  { id: 8, name: 'Academic', color: '#b91c1c' },
  { id: 9, name: 'Startup Vibe', color: '#ec4899' },
  { id: 10, name: 'Premium Distinct', color: '#14b8a6' },
];

// Mpya: Picha na Maelezo kwa ajili ya Slideshow ya Team Management
const MANAGEMENT_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    title: 'Connect with your team instantly',
    desc: 'Fanya mawasiliano ya haraka na timu yako popote walipo kupitia mfumo wetu.'
  },
  {
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80',
    title: 'Manage Operations Seamlessly',
    desc: 'Simamia mikutano, wafanyakazi, na maamuzi muhimu kwa urahisi zaidi.'
  },
  {
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    title: 'Boost Productivity',
    desc: 'Tatua changamoto za kinidhamu na boresha utendaji kazi wa kila siku.'
  }
];

// Mpya: Function ya kuzalisha HTML ya Templates 10 za CV
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateCVTemplate = (data: any, templateId: number, color: string, linkedInUrl: string) => {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246';
  };
  
  const rgbColor = hexToRgb(color);
  
  // Akili ya kupanga listi moja kwa moja (Skills, Languages, Certificates, Referees)
  const formatCommaList = (text: string, dotColor: string = color) => {
    if (!text) return '';
    const items = text.includes(',') ? text.split(',') : text.split('\n');
    return `<ul style="margin: 0; padding-left: 20px; list-style-type: none;">` + 
      items.map((item: string) => {
        const cleaned = item.replace(/^[-\*•]\s*/, '').trim();
        if (!cleaned) return '';
        return `<li style="margin-bottom: 6px; position: relative; color: #444; line-height: 1.6;"><span style="position: absolute; left: -15px; color: ${dotColor}; font-weight: bold;">&bull;</span>${cleaned}</li>`;
      }).join('') + `</ul>`;
  };

  // Kupanga uzoefu wa kazi au elimu vizuri hata kama hawakuandika kwa mtindo sahihi
  const formatParagraphs = (text: string, dotColor: string = color) => (text || '').split('\n').map((line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      return `<ul style="margin: 0; padding-left: 20px; list-style-type: none;"><li style="margin-bottom: 6px; position: relative; color: #444;"><span style="position: absolute; left: -15px; color: ${dotColor}; font-weight: bold;">&bull;</span>${trimmed.substring(1).trim()}</li></ul>`;
    }
    return trimmed ? `<div style="margin-top: 12px; margin-bottom: 4px; font-weight: bold; color: #222; font-size: 15px;">${trimmed}</div>` : '';
  }).join('');

  const contactItems = [
    data.phone ? `<div><strong>Phone:</strong> ${data.phone}</div>` : '',
    data.email ? `<div><strong>Email:</strong> ${data.email}</div>` : '',
    data.address ? `<div><strong>Address:</strong> ${data.address}</div>` : '',
    linkedInUrl ? `<div><strong>LinkedIn:</strong> ${linkedInUrl}</div>` : ''
  ].filter(Boolean).join('');

  const contactLine = [data.phone, data.email, data.address, linkedInUrl].filter(Boolean).join(' | ');

  const picHtml = data.profilePic 
    ? `<img src="${data.profilePic}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;" />`
    : ``;

  switch(templateId) {
    case 2: // Classic Exec
      return `
        <div style="font-family: 'Times New Roman', serif; width: 210mm; min-height: 297mm; background: #fff; color: #000; padding: 40px; box-sizing: border-box; overflow: hidden; position: relative;">
          <div style="text-align: center; border-bottom: 2px solid ${color}; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="font-size: 36px; margin: 0; text-transform: uppercase; color: ${color};">${data.fullName || 'JINA LAKO'}</h1>
            <h2 style="font-size: 18px; margin: 5px 0 15px 0; font-weight: normal;">${data.title || 'Cheo / Taaluma'}</h2>
            <div style="font-size: 14px;">${contactLine}</div>
          </div>
          ${data.summary ? `
            <div style="margin-bottom: 20px;">
              <p style="font-size: 15px; line-height: 1.6; text-align: justify; margin: 0;">${data.summary}</p>
            </div>
          ` : ''}
          ${data.experience ? `
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; color: ${color}; margin-bottom: 10px;">Professional Experience</h3>
              <div style="font-size: 15px;">${formatParagraphs(data.experience, color)}</div>
            </div>
          ` : ''}
          ${data.education ? `
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; color: ${color}; margin-bottom: 10px;">Education</h3>
              <div style="font-size: 15px;">${formatParagraphs(data.education, color)}</div>
            </div>
          ` : ''}
          <div style="display: flex; gap: 40px; margin-bottom: 25px;">
            ${data.skills ? `
              <div style="flex: 1;">
                <h3 style="font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; color: ${color}; margin-bottom: 10px;">Skills</h3>
                <div style="font-size: 15px;">${formatCommaList(data.skills, color)}</div>
              </div>
            ` : ''}
            ${data.languages ? `
              <div style="flex: 1;">
                <h3 style="font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; color: ${color}; margin-bottom: 10px;">Languages</h3>
                <div style="font-size: 15px;">${formatCommaList(data.languages, color)}</div>
              </div>
            ` : ''}
          </div>
          ${data.referees ? `
            <div style="margin-bottom: 25px;">
              <h3 style="font-size: 18px; text-transform: uppercase; border-bottom: 1px solid #ccc; color: ${color}; margin-bottom: 10px;">Referees</h3>
              <div style="font-size: 15px;">${formatCommaList(data.referees, color)}</div>
            </div>
          ` : ''}
        </div>
      `;
    case 3: // Elegant Right
    case 4: // Minimalist
      return `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; width: 210mm; min-height: 297mm; background: #fff; color: #333; display: flex; box-sizing: border-box; overflow: hidden;">
          <div style="width: 65%; padding: 40px; box-sizing: border-box;">
            <h1 style="font-size: 40px; margin: 0; color: ${color}; font-weight: 900;">${data.fullName || 'JINA LAKO'}</h1>
            <h2 style="font-size: 20px; margin: 5px 0 30px 0; color: #777;">${data.title || 'Cheo'}</h2>
            ${data.summary ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; font-size: 18px; border-left: 4px solid ${color}; padding-left: 10px;">PROFILE</h3>
                <p style="font-size: 14px; line-height: 1.6;">${data.summary}</p>
              </div>
            ` : ''}
            ${data.experience ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; font-size: 18px; border-left: 4px solid ${color}; padding-left: 10px;">EXPERIENCE</h3>
                <div style="font-size: 14px;">${formatParagraphs(data.experience, color)}</div>
              </div>
            ` : ''}
            ${data.education ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; font-size: 18px; border-left: 4px solid ${color}; padding-left: 10px;">EDUCATION</h3>
                <div style="font-size: 14px;">${formatParagraphs(data.education, color)}</div>
              </div>
            ` : ''}
            ${data.referees ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; font-size: 18px; border-left: 4px solid ${color}; padding-left: 10px;">REFEREES</h3>
                <div style="font-size: 14px;">${formatCommaList(data.referees, color)}</div>
              </div>
            ` : ''}
          </div>
          <div style="width: 35%; background: ${templateId === 4 ? '#f8fafc' : color}; color: ${templateId === 4 ? '#333' : '#fff'}; padding: 40px 30px; box-sizing: border-box; border-left: ${templateId === 4 ? `4px solid ${color}` : 'none'};">
            ${picHtml ? `<div style="text-align: right; margin-bottom: 30px;">${picHtml.replace('border-radius: 50%', 'border-radius: 10px')}</div>` : ''}
            <div style="margin-bottom: 30px; font-size: 13px; line-height: 1.8;">
              <h3 style="border-bottom: 1px solid ${templateId === 4 ? color : 'rgba(255,255,255,0.3)'}; padding-bottom: 5px;">CONTACT</h3>
              <div style="margin-top:10px;">${data.phone ? `Phone:<br/>${data.phone}<br/><br/>` : ''}${data.email ? `Email:<br/>${data.email}<br/><br/>` : ''}${data.address ? `Address:<br/>${data.address}<br/><br/>` : ''}${linkedInUrl ? `LinkedIn:<br/>${linkedInUrl}` : ''}</div>
            </div>
            ${data.skills ? `
              <div style="margin-bottom: 30px; font-size: 13px;">
                <h3 style="border-bottom: 1px solid ${templateId === 4 ? color : 'rgba(255,255,255,0.3)'}; padding-bottom: 5px;">SKILLS</h3>
                <div style="margin-top:10px;">${formatCommaList(data.skills, templateId === 4 ? color : '#fff')}</div>
              </div>
            ` : ''}
            ${data.languages ? `
              <div style="margin-bottom: 30px; font-size: 13px;">
                <h3 style="border-bottom: 1px solid ${templateId === 4 ? color : 'rgba(255,255,255,0.3)'}; padding-bottom: 5px;">LANGUAGES</h3>
                <div style="margin-top:10px;">${formatCommaList(data.languages, templateId === 4 ? color : '#fff')}</div>
              </div>
            ` : ''}
            ${data.certificates ? `
              <div style="margin-bottom: 30px; font-size: 13px;">
                <h3 style="border-bottom: 1px solid ${templateId === 4 ? color : 'rgba(255,255,255,0.3)'}; padding-bottom: 5px;">CERTIFICATES</h3>
                <div style="margin-top:10px;">${formatCommaList(data.certificates, templateId === 4 ? color : '#fff')}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    case 5: // Creative Bold (Top Banner)
    case 9: // Startup Vibe
    case 10: // Premium Distinct
      return `
        <div style="font-family: Arial, sans-serif; width: 210mm; min-height: 297mm; background: #fff; color: #333; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden;">
          <div style="background: ${color}; padding: 40px 50px; color: #fff; display: flex; justify-content: space-between; align-items: center;">
            <div>
               <h1 style="font-size: 36px; margin: 0; letter-spacing: 1px;">${data.fullName || 'JINA LAKO'}</h1>
               <h2 style="font-size: 18px; margin: 5px 0 15px 0; font-weight: normal; color: rgba(255,255,255,0.8);">${data.title || 'Cheo / Taaluma'}</h2>
               <div style="font-size: 13px; line-height: 1.6;">${contactLine}</div>
            </div>
            ${picHtml ? `<div>${picHtml.replace('border-radius: 50%', 'border-radius: 16px; border: 3px solid #fff;')}</div>` : ''}
          </div>
          
          <div style="padding: 40px 50px; display: flex; gap: 30px;">
             <div style="flex: 2; padding-right: 20px; border-right: 1px solid #eee;">
               ${data.summary ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Profile</h3>
                   <p style="font-size: 14px; line-height: 1.6; margin: 0;">${data.summary}</p>
                 </div>
               ` : ''}
               ${data.experience ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Experience</h3>
                   <div style="font-size: 14px;">${formatParagraphs(data.experience, color)}</div>
                 </div>
               ` : ''}
               ${data.education ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Education</h3>
                   <div style="font-size: 14px;">${formatParagraphs(data.education, color)}</div>
                 </div>
               ` : ''}
             </div>
             <div style="flex: 1;">
               ${data.skills ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Skills</h3>
                   <div style="font-size: 14px;">${formatCommaList(data.skills, color)}</div>
                 </div>
               ` : ''}
               ${data.languages ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Languages</h3>
                   <div style="font-size: 14px;">${formatCommaList(data.languages, color)}</div>
                 </div>
               ` : ''}
               ${data.certificates ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Certificates</h3>
                   <div style="font-size: 14px;">${formatCommaList(data.certificates, color)}</div>
                 </div>
               ` : ''}
               ${data.referees ? `
                 <div style="margin-bottom: 30px;">
                   <h3 style="color: ${color}; font-size: 16px; text-transform: uppercase; border-bottom: 2px solid ${color}; padding-bottom: 5px; margin-bottom: 15px;">Referees</h3>
                   <div style="font-size: 14px;">${formatCommaList(data.referees, color)}</div>
                 </div>
               ` : ''}
             </div>
          </div>
        </div>
      `;
    case 6: // Corporate Tone
    case 7: // Tech Dark
    case 8: // Academic
    case 1: // Modern Left (Default)
    default:
      return `
        <div style="font-family: ${templateId === 8 ? "'Times New Roman', serif" : "Arial, sans-serif"}; width: 210mm; min-height: 297mm; background: #fff; color: #333; display: flex; box-sizing: border-box; overflow: hidden;">
          <div style="width: 35%; background: ${templateId === 7 ? '#1e293b' : `rgba(${rgbColor}, 0.05)`}; color: ${templateId === 7 ? '#fff' : '#333'}; padding: 30px; border-right: 2px solid ${color}; box-sizing: border-box;">
            ${picHtml ? `<div style="text-align: center; margin-bottom: 20px;">${picHtml.replace('width: 120px', 'width: 140px').replace('height: 120px', 'height: 140px')}</div>` : ''}
            <h1 style="color: ${color}; font-size: 26px; margin: 0 0 5px 0;">${data.fullName || 'JINA LAKO'}</h1>
            <h2 style="font-size: 15px; color: ${templateId === 7 ? '#cbd5e1' : '#555'}; margin-top: 0;">${data.title || 'Cheo / Taaluma'}</h2>
            <div style="margin-top: 30px; font-size: 13px; line-height: 1.8;">
              <h3 style="color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 4px;">CONTACT</h3>
              ${contactItems}
            </div>
            ${data.skills ? `
              <div style="margin-top: 30px; font-size: 13px;">
                <h3 style="color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 4px;">SKILLS</h3>
                <div style="margin-top: 10px;">${formatCommaList(data.skills, color)}</div>
              </div>
            ` : ''}
            ${data.languages ? `
              <div style="margin-top: 30px; font-size: 13px;">
                <h3 style="color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 4px;">LANGUAGES</h3>
                <div style="margin-top: 10px;">${formatCommaList(data.languages, color)}</div>
              </div>
            ` : ''}
          </div>
          <div style="width: 65%; padding: 40px; box-sizing: border-box;">
            ${data.summary ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; text-transform: uppercase;">Profile</h3>
                <p style="font-size: 14px; line-height: 1.6;">${data.summary}</p>
              </div>
            ` : ''}
            ${data.experience ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; text-transform: uppercase;">Experience</h3>
                <div style="font-size: 14px;">${formatParagraphs(data.experience, color)}</div>
              </div>
            ` : ''}
            ${data.education ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; text-transform: uppercase;">Education</h3>
                <div style="font-size: 14px;">${formatParagraphs(data.education, color)}</div>
              </div>
            ` : ''}
            ${data.certificates ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; text-transform: uppercase;">Certifications</h3>
                <div style="font-size: 14px;">${formatCommaList(data.certificates, color)}</div>
              </div>
            ` : ''}
            ${data.referees ? `
              <div style="margin-bottom: 30px;">
                <h3 style="color: ${color}; text-transform: uppercase;">Referees</h3>
                <div style="font-size: 14px;">${formatCommaList(data.referees, color)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
  }
};

// Mpya: Msaidizi wa kubadili Hex kwenda RGB kwa ajili ya background transparency kwenye PDF
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '59, 130, 246';
};

// Mpya: Msaidizi wa kutengeneza UUID ili kuepuka "crypto.randomUUID is not a function" kwenye non-secure contexts
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const PersonalRoom = () => {
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'plans' | 'job_dashboard' | 'business_dashboard' | 'post_job_form' | 'job_posted_list' | 'business_posted_jobs' | 'business_requests' | 'applicant_interviews' | 'business_scheduled_interviews' | 'business_penalties' | 'admin_users' | 'employee_directory' | 'schedule_staff_meeting' | 'employee_dashboard' | 'disciplinary_hearing' | 'admin_disciplinary_cases' | 'admin_case_management' | 'terminations_dashboard' | 'msa_dashboard' | 'automatic_termination_dashboard' | 'resignation_dashboard' | 'leave_dashboard' | 'payslips_dashboard'>('plans');
  const [disciplinaryCases, setDisciplinaryCases] = useState<DisciplinaryCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [jobTypeFilter, setJobTypeFilter] = useState('All'); // Mpya: State kwa ajili ya kuchuja kwa aina ya kazi
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [interviewValues, setInterviewValues] = useState({
    dateTime: new Date(),
    description: '',
    duration: 60, // Mpya: Ongeza muda wa interview (default 60 mins)
    participants: '',
  });
  const { user } = useUser();
  const client = useStreamVideoClient();
  const [callDetails, setCallDetails] = useState<Call>();
  const [isScheduling, setIsScheduling] = useState(false);
  // Mpya: State kwa ajili ya kuratibu interview
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null); // Mpya: Kufuatilia PDF download
  const [schedulingForApplication, setSchedulingForApplication] = useState<Application | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null); // Mpya: Kufuatilia kazi iliyofunguliwa
  const [viewingCvApp, setViewingCvApp] = useState<Application | null>(null); // Mpya: Modal ya kusoma CV

  const [justRead, setJustRead] = useState<Set<string>>(new Set()); // Mpya: Kufuatilia maombi yaliyosomwa kwenye session hii
  const [coverLetterLanguage, setCoverLetterLanguage] = useState<'sw' | 'en'>('sw');
  const [poBoxNumber, setPoBoxNumber] = useState('');
  const [appRegion, setAppRegion] = useState('');
  const [step5Errors, setStep5Errors] = useState<Record<string, string>>({});
  // Mpya: State kwa ajili ya fomu ya kutuma maombi (multi-step)
  const [applicationStep, setApplicationStep] = useState(1);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState(''); // Mpya: State ya kuandaa CV
  const [linkedInUrl, setLinkedInUrl] = useState(''); // Mpya: State ya LinkedIn
  
  // Mpya: States kwa ajili ya CV Builder na Attachments
  const [isBuildingCV, setIsBuildingCV] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(1); // Mpya: Kufuatilia template iliyochaguliwa
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [cvData, setCvData] = useState({
    fullName: '', title: '', summary: '', education: '', experience: '', skills: '',
    phone: '', email: '', address: '', languages: '', certificates: '', profilePic: '', referees: ''
  });

  const [coverLetter, setCoverLetter] = useState('');
  const [appCountry, setAppCountry] = useState('Tanzania');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null); // Mpya: Kufuatilia malipo

  // Mpya: States kwa ajili ya ku-cancel na reschedule interview
  const [isCancelingInterview, setIsCancelingInterview] = useState(false);
  const [cancelingApplication, setCancelingApplication] = useState<Application | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [willReschedule, setWillReschedule] = useState(false);
  const [rescheduleDateTime, setRescheduleDateTime] = useState(new Date());
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [isRequestingReschedule, setIsRequestingReschedule] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Mpya: States & Refs kwa ajili ya E-Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Mpya: States kwa ajili ya kuomba Refund
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [applicationForRefund, setApplicationForRefund] = useState<Application | null>(null);
  const [refundMethod, setRefundMethod] = useState<'account' | 'subscription'>('account');
  const [refundAccountDetails, setRefundAccountDetails] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0); // Slideshow Index
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Inajishusha kila baada ya dakika 1
    return () => clearInterval(timer);
  }, []);

  // Mpya: States kwa ajili ya Employee Directory
  const myEmployees = useMemo<Employee[]>(() => {
    if (!user?.id) return [];
    const myJobIdsSet = new Set(jobs.filter((job) => job.createdBy === user.id).map((job) => job.id));
    
    const uniqueEmployees = new Map<string, Employee>();
    
    applications.forEach((app) => {
      if (app.isAccepted && myJobIdsSet.has(app.jobId) && app.applicantId) {
        if (!uniqueEmployees.has(app.applicantId)) {
          uniqueEmployees.set(app.applicantId, {
            id: app.applicantId,
            appId: app.id,
            employerId: user.id,
            name: app.applicantName || 'Mwombaji',
            email: app.applicantEmail || '',
            phone: app.applicantPhone || '',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicantName || 'Mwombaji')}&background=random`,
            empId: `EMP-${app.id.substring(0, 5).toUpperCase()}`,
            role: app.employeeRole || app.jobPosition,
            department: app.employeeDepartment || 'Unassigned',
            status: app.employeeStatus || 'Active',
            joinedAt: app.appliedAt,
          });
        }
      }
    });
    return Array.from(uniqueEmployees.values());
  }, [applications, jobs, user?.id]);
  const [searchEmpQuery, setSearchEmpQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpData, setEditEmpData] = useState({ role: '', department: '', status: '' });
  const [terminatingEmployee, setTerminatingEmployee] = useState<Employee | null>(null);
  const [msaStep, setMsaStep] = useState(1);
  const [autoTermStep, setAutoTermStep] = useState(1);
  const [resignationStep, setResignationStep] = useState(1);
  const [clearanceStatus, setClearanceStatus] = useState({ it: false, finance: false, operations: false });

  // Mpya: States kwa ajili ya Schedule Staff Meeting (The Smart Calendar Scheduler)
  const [staffMeetingTitle, setStaffMeetingTitle] = useState('');
  const [staffMeetingDate, setStaffMeetingDate] = useState(new Date());
  const [staffMeetingDuration, setStaffMeetingDuration] = useState(60);
  const [staffMeetingAttendees, setStaffMeetingAttendees] = useState<Set<string>>(new Set());
  const [isSchedulingStaffMeeting, setIsSchedulingStaffMeeting] = useState(false);
  const [previewMeetingId, setPreviewMeetingId] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveTypeForm, setLeaveTypeForm] = useState('🏖️ Annual Leave');

  // Mpya: Inasikiliza mabadiliko ya URL Parameters LIVE (Kama mtu amebofya notification)
  useEffect(() => {
    const viewParam = searchParams.get('view') as any;
    if (viewParam) {
      const storedSub = localStorage.getItem('user_subscription');
      let currentPlan = null;
      if (storedSub) {
        const { planId, expiry } = JSON.parse(storedSub);
        if (Date.now() < expiry) {
          currentPlan = planId;
        }
      }

      const requiresBusiness = ['business_dashboard', 'post_job_form', 'business_posted_jobs', 'business_requests', 'business_scheduled_interviews', 'business_penalties'].includes(viewParam);
      // Tumeondoa 'applicant_interviews' hapa ili ukurasa wa interview uwe OPEN bila kulazimisha kulipia Job Search Plan
      const requiresJobSearch = ['job_dashboard', 'job_posted_list'].includes(viewParam);

      if (requiresBusiness && currentPlan !== 'business_conferencing') {
        toast.error('Tafadhali lipia kifurushi cha Business Conferencing ili kufungua taarifa hii.');
        setActiveView('plans');
      } else if (requiresJobSearch && currentPlan !== 'job_search') {
        toast.error('Tafadhali lipia kifurushi cha Job Search ili kufungua taarifa hii.');
        setActiveView('plans');
      } else {
        setActiveView(viewParam);
      }
      // Futa view param kwenye URL isisumbue
      router.replace('/personal-room', { scroll: false });
    }
  }, [searchParams, router]);

  // Mpya: Auto-Slide Timer kwa ajili ya Team Management Slideshow
  useEffect(() => {
    if (activeView !== 'admin_users') return;
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % MANAGEMENT_SLIDES.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [activeView]);

  // Mpya: Generate auto link id unapoingia kwenye Smart Scheduler
  useEffect(() => {
    if (activeView === 'schedule_staff_meeting' && !previewMeetingId) {
      setPreviewMeetingId(generateUUID());
    }
  }, [activeView, previewMeetingId]);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      setApplicantEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [user?.primaryEmailAddress?.emailAddress]);

  // Memoize derived data to prevent expensive recalculations on every render.
  // This is a key performance optimization.
  const myJobIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    // Use a Set for efficient lookups (O(1) average time complexity for .has())
    return new Set(jobs.filter(job => job.createdBy === user.id).map(job => job.id));
  }, [jobs, user?.id]);

  const myJobs = useMemo(() => {
    if (!user?.id) return [];
    return jobs.filter(job => job.createdBy === user.id);
  }, [jobs, user?.id]);

  const myApplications = useMemo(() => {
    return applications.filter(app => myJobIds.has(app.jobId));
  }, [applications, myJobIds]);

  // Mpya: Chuja maombi yaliyotumwa na mtumiaji wa sasa (Mwombaji/Job Seeker)
  const mySentApplications = useMemo(() => {
    if (!user?.id) return [];
    return applications.filter(app => app.applicantId === user.id);
  }, [applications, user?.id]);

  // Mpya: Pata kesi ya kinidhamu ya mtumiaji wa sasa
  const myDisciplinaryCase = useMemo(() => {
    if (!user?.id) return null;
    // Tafuta kesi ya hivi karibuni ambayo bado haijafungwa
    return disciplinaryCases
        .filter(c => c.employeeId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }, [disciplinaryCases, user?.id]);

  // Mpya: Kazi ya kuweka alama kuwa ombi limesomwa
  const handleMarkAsRead = async (appId: string) => {
    // Usifanye kitu kama tayari tumeweka alama kwenye session hii au kama ombi tayari limesomwa
    if (justRead.has(appId)) return;
    const app = myApplications.find(a => a.id === appId);
    if (app && !app.isRead) {
      try {
        await updateDoc(doc(db, 'job_applications', appId), { isRead: true });
        setJustRead(prev => new Set(prev).add(appId)); // Weka alama kuwa tumesoma kwenye session hii
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };
  // Mpya: Logic kwa ajili ya kudownload tangazo la kazi kama PDF
  const handleDownloadJobAsPDF = async (jobId: string, jobTitle: string, companyName: string) => {
    const posterElement = document.getElementById(`job-poster-${jobId}`);
    if (!posterElement) {
      toast.error('Could not find job post element to download.');
      return;
    }
    setIsDownloading(jobId);
    
    // Ondoa class inayoshrink poster kwenye simu kwa muda ili PDF itoke kwa ubora (A4 Kamili)
    const isResponsive = posterElement.classList.contains('responsive-poster');
    if (isResponsive) {
      posterElement.classList.remove('responsive-poster');
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(posterElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
      } as unknown as Options);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      // Tunakokotoa urefu mpya kulingana na uwiano (Aspect Ratio)
      let finalHeight = (canvas.height * pdfWidth) / canvas.width;
      let finalWidth = pdfWidth;

      // Kama urefu unazidi karatasi ya A4, tunaipunguza ienee yote kwenye page moja bila kukatwa
      if (finalHeight > pdfPageHeight) {
        finalHeight = pdfPageHeight;
        finalWidth = (canvas.width * pdfPageHeight) / canvas.height;
      }

      // Tunaweka picha katikati (center) kama upana umepungua
      const xOffset = (pdfWidth - finalWidth) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
      pdf.save(`Job Announcement - ${jobTitle} at ${companyName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF.');
    } finally {
      // Rudisha class ya responsive ukishamaliza kudownload
      if (isResponsive) {
        posterElement.classList.add('responsive-poster');
      }
      setIsDownloading(null);
    }
  };

  // Mpya: Logic ya kudownload nyaraka zenye kurasa nyingi (CV au Cover Letter)
  const handleDownloadMultiPagePDF = async (elementId: string, fileName: string, isCoverLetter: boolean = false) => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Could not find document element.');
      return;
    }

    setIsDownloading(elementId);
    
    // Kama ni Cover Letter, mzazi wake amefichwa (opacity: 0). 
    // Tunaifanya iwe visible kwa muda ili html2canvas iweze kuchukua picha.
    const parent = element.parentElement;
    let originalOpacity = '';
    if (isCoverLetter && parent) {
      originalOpacity = parent.style.opacity;
      parent.style.opacity = '1';
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      } as unknown as Options);
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const finalHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = Math.max(297, finalHeight);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, pageHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF.');
    } finally {
      if (isCoverLetter && parent) {
        parent.style.opacity = originalOpacity;
      }
      setIsDownloading(null);
    }
  };

  // Mpya: Function inayosuluhisha ishu ya "High Quality / Selectable Text PDF"
  // Hufungua CV kwenye dirisha jipya na kutumia mfumo asilia wa browser kusave PDF!
  const handlePrintCV = (htmlContent: string, applicantName: string, attachments?: {name: string, url: string}[]) => {
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
       attachmentsHtml = `
          <div style="page-break-before: always; padding: 40px; font-family: sans-serif;">
             <h2 style="text-align: center; color: #333; margin-bottom: 30px; text-transform: uppercase;">Viambatanisho (Attachments)</h2>
             ${attachments.map(att => {
                const isImage = att.url.match(/\\.(jpeg|jpg|gif|png)(\\?|$)/i) || att.name.match(/\\.(jpeg|jpg|gif|png)$/i);
                return `
                   <div style="margin-bottom: 40px; text-align: center;">
                      <h3 style="color: #555; text-decoration: underline; margin-bottom: 15px;">${att.name}</h3>
                      ${isImage ? `<img src="${att.url}" style="max-width: 100%; max-height: 900px; border: 1px solid #ccc; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />` : `<p style="color: #777;">[ Hiki ni kiambatanisho cha PDF au DOC. Picha haipo. ]</p>`}
                   </div>
                `;
             }).join('')}
          </div>
       `;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>CV_${applicantName.replace(/\s+/g, '_')}</title>
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
            </style>
          </head>
          <body>
            ${htmlContent}
            ${attachmentsHtml}
            <script>
              window.onload = () => {
                setTimeout(() => { window.print(); window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast.error("Tafadhali ruhusu Popups kwenye browser yako kudownload High-Quality CV.");
    }
  };

  // Mpya: Logic ya kusave staff meeting na kutuma mialiko (Smart Calendar Scheduler)
  const handleScheduleStaffMeeting = async () => {
    if (!user?.id) {
      toast.error("Mtumiaji hajajulikana (User ID missing). Tafadhali ingia upya.");
      return;
    }
    if (!staffMeetingTitle.trim()) {
      toast.error("Tafadhali andika jina la kikao (Meeting Title).");
      return;
    }
    if (staffMeetingAttendees.size === 0) {
      toast.error("Tafadhali chagua angalau mfanyakazi mmoja kutoka upande wa kulia.");
      return;
    }
    setIsSchedulingStaffMeeting(true);
    try {
      if (!client) throw new Error("Video client haiko tayari");
      const call = client.call('default', previewMeetingId);
      const startsAt = staffMeetingDate.toISOString();
      
      const memberIds = new Set<string>();
      memberIds.add(user.id);
      
      const members = [{ user_id: user.id, role: 'admin' }];
      const selectedEmpsList = myEmployees.filter(e => staffMeetingAttendees.has(e.id));
      selectedEmpsList.forEach(emp => {
         if (emp.id && !memberIds.has(emp.id)) {
             memberIds.add(emp.id);
             members.push({ user_id: emp.id, role: 'call_member' });
         }
      });

      await call.getOrCreate({
          data: {
              starts_at: startsAt,
              members,
              custom: { description: staffMeetingTitle, meetingType: 'staff_meeting' }
          }
      });
      const meetingLink = `${window.location.origin}/meeting/${previewMeetingId}`;

      // Tuma notifications kwa kila mfanyakazi aliyechaguliwa
      selectedEmpsList.forEach(emp => {
         addDoc(collection(db, 'notifications'), {
            userId: emp.id,
            title: 'Mualiko wa Kikao (Staff Meeting)',
            message: `Umealikwa kwenye kikao cha "${staffMeetingTitle}" kitakachofanyika ${new Date(startsAt).toLocaleString('sw-TZ')}. Bonyeza hapa kujiunga na kikao kupitia link hii.`,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'staff_meeting',
            link: meetingLink
         }).catch(console.error);
      });
      toast.success("Kikao kimepangwa kikamilifu na mialiko imetumwa!");
      setActiveView('admin_users');
      setStaffMeetingTitle(''); setStaffMeetingDate(new Date()); setStaffMeetingAttendees(new Set()); setPreviewMeetingId('');
    } catch (error) { console.error(error); toast.error("Imeshindwa kupanga kikao."); } finally { setIsSchedulingStaffMeeting(false); }
  };

  // ==================== E-SIGNATURE LOGIC ====================
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000'; // Rangi ya wino wa sahihi (Nyeusi)
      setIsDrawing(true);
      setHasSignature(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      setSignatureDataUrl(null);
    }
  };
  // ============================================================

  // Mpya: Logic za Directory (Export, Edit, Delete)
  const handleExportCSV = () => {
    const headers = ['Emp ID', 'Name', 'Email', 'Phone', 'Role', 'Department', 'Status', 'Joined Date'];
    const rows = myEmployees.map(emp => [
      `"${emp.empId}"`, `"${emp.name}"`, `"${emp.email}"`, `"${emp.phone || ''}"`, `"${emp.role}"`, `"${emp.department}"`, `"${emp.status}"`, `"${new Date(emp.joinedAt).toLocaleDateString('sw-TZ')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Employee_Directory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDirectoryPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Tafadhali ruhusu popups kudownload PDF.");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Employee Directory</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; color: #111827; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h2>Employee Directory - UYAO</h2>
          <table>
            <thead>
              <tr><th>Emp ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Department</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${myEmployees.map(emp => `<tr><td>${emp.empId}</td><td>${emp.name}</td><td>${emp.email}</td><td>${emp.phone || 'N/A'}</td><td>${emp.role}</td><td>${emp.department}</td><td>${emp.status}</td></tr>`).join('')}
            </tbody>
          </table>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    try {
      await updateDoc(doc(db, 'job_applications', editingEmployee.appId), { employeeRole: editEmpData.role, employeeDepartment: editEmpData.department, employeeStatus: editEmpData.status });
      toast.success("Taarifa za mfanyakazi zimesasishwa!");
      setEditingEmployee(null);
    } catch (error) { console.error(error); toast.error("Imeshindwa kusasisha taarifa."); }
  };

  const handleDeleteEmployee = async (appId: string) => {
    if (window.confirm("Je, una uhakika unataka kumsitisha mfanyakazi huyu kwenye orodha?")) {
      try {
        await updateDoc(doc(db, 'job_applications', appId), { isAccepted: false, employeeStatus: 'Terminated' });
        toast.success("Mfanyakazi amesitishwa na kuondolewa kwenye Directory.");
      } catch (error) { console.error(error); toast.error("Imeshindwa kufuta mfanyakazi."); }
    }
  };

  // Mpya: Logic kwa ajili ya kutuma ombi la Refund
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRefundSubmit = async () => {
    if (!applicationForRefund) return;
    if (refundMethod === 'account' && !refundAccountDetails.trim()) {
      toast.error('Tafadhali ingiza namba ya akaunti au simu yako.');
      return;
    }
    setIsProcessingRefund(true);
    try {
      await updateDoc(doc(db, 'job_applications', applicationForRefund.id), {
        refundRequested: true,
        refundMethod: refundMethod,
        refundAccountDetails: refundMethod === 'account' ? refundAccountDetails : null,
        refundRequestedAt: new Date().toISOString()
      });
      
      toast.success('Ombi la refund limetumwa kikamilifu. Tafadhali subiri wiki 2 hadi mwezi 1.');
      setIsRequestingRefund(false);
      setApplicationForRefund(null);
      setRefundAccountDetails('');

      // Mpya: Tuma notification kwa mwombaji kwenye mfumo
      addDoc(collection(db, 'notifications'), {
        userId: user?.id,
        title: 'Ombi la Refund Linashughulikiwa',
        message: `Ombi lako la kurudishiwa TZS 5,000 kupitia ${refundMethod} kwa usaili wa ${applicationForRefund.jobPosition} linafanyiwa kazi.`,
        createdAt: new Date().toISOString(),
        isRead: false,
            type: 'refund',
            link: '/personal-room?view=applicant_interviews'
      }).catch(console.error);

    } catch(e) {
      console.error(e);
      toast.error('Imeshindwa kutuma ombi la refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Mpya: Logic kwa ajili ya kutuma maombi (multi-step)
  const handleApplicationSubmit = async () => {
    if (!user || !applyingJob || (!cvFile && !linkedInUrl.trim() && !cvText.trim())) {
      toast.error('Tafadhali weka CV yako au Link ya LinkedIn au tengeneza CV kwenye mfumo.');
      return;
    }
    const poBoxPrefix = coverLetterLanguage === 'sw' ? 'S.L.P' : 'P.O.Box';
    const finalAppAddress = poBoxNumber && appRegion ? `${poBoxPrefix} ${poBoxNumber}, ${appRegion}, ${appCountry}` : applicantAddress;
    const finalAppPhone = `${COUNTRY_DIAL_CODES[appCountry]?.split(' ')[1] || ''} ${applicantPhone}`.trim();

    setIsUploadingCV(true);
    try {
      // 1. Upload CV to Firebase Storage
      let cvUrl = '';
      if (cvFile) {
        const storageRef = ref(firebaseStorage, `cv_uploads/${Date.now()}_${cvFile.name}`);
        await uploadBytes(storageRef, cvFile);
        cvUrl = await getDownloadURL(storageRef);
      }

      // Upload Signature to Firebase Storage
      let signatureUrl = '';
      if (hasSignature && signatureDataUrl) {
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        if (blob) {
          const sigRef = ref(firebaseStorage, `signatures/${Date.now()}_${user.id}.png`);
          await uploadBytes(sigRef, blob);
          signatureUrl = await getDownloadURL(sigRef);
        }
      }

      // Mpya: Pakia viambatanisho (Attachments) kama vipo
      const uploadedAttachments: { name: string; url: string }[] = [];
      if (attachmentFiles.length > 0) {
        for (const file of attachmentFiles) {
          const fileRef = ref(firebaseStorage, `application_attachments/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploadedAttachments.push({ name: file.name, url });
        }
      }

      // 2. Save Application Data to Firestore Database
      await addDoc(collection(db, 'job_applications'), {
        jobId: applyingJob.id,
        jobPosition: applyingJob.jobPosition,
        companyName: applyingJob.companyName,
        applicantId: user.id,
        applicantName: user.fullName || 'Mwombaji',
        applicantEmail: user.primaryEmailAddress?.emailAddress || '',
        applicantAddress: finalAppAddress.trim(),
        applicantPhone: finalAppPhone.trim(),
        cvUrl: cvUrl,
        cvText: cvText.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        coverLetter: coverLetter,
        signatureUrl: signatureUrl || null,
        attachments: uploadedAttachments,
        appliedAt: new Date().toISOString()
      });

      // 3. Tuma barua pepe (Email) ya uthibitisho kwa mwombaji
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || 'Mwombaji',
            jobPosition: applyingJob.jobPosition,
            companyName: applyingJob.companyName,
            phone: finalAppPhone.trim()
          })
        });
      } catch (emailError) {
        console.error("Ilishindwa kutuma email ya uthibitisho: ", emailError);
      }

      toast.success(`Maombi ya kazi ya ${applyingJob.jobPosition} yametumwa kikamilifu!`);
      closeApplicationModal();

      // Mpya: Tuma Notification ya ndani ya mfumo
      addDoc(collection(db, 'notifications'), {
        userId: user.id,
        title: 'Maombi Yametumwa Kikamilifu',
        message: `Maombi yako ya kazi ya ${applyingJob.jobPosition} kwenye ${applyingJob.companyName} yamepokelewa. Umetumiwa barua pepe (email) ya uthibitisho.`,
        createdAt: new Date().toISOString(),
        isRead: false,
            type: 'application_sent',
            link: '/personal-room?view=applicant_interviews'
      }).catch(console.error);

    } catch (error) {
      console.error("Error submitting application: ", error);
      toast.error('Imeshindwa kutuma maombi. Tafadhali jaribu tena.');
    } finally {
      setIsUploadingCV(false);
    }
  };

  const closeApplicationModal = () => {
    setApplyingJob(null);
    // Reset state za fomu ya maombi
    setApplicationStep(1);
    setCvFile(null);
    setCvText('');
    setLinkedInUrl('');
    setAppCountry('Tanzania');
    setApplicantAddress('');
    setApplicantPhone('');
    setApplicantEmail(user?.primaryEmailAddress?.emailAddress || '');
    
    setCoverLetterLanguage('sw');
    setPoBoxNumber('');
    setAppRegion('');
    setStep5Errors({});
    setIsBuildingCV(false);
    setAttachmentFiles([]);
    setCvData({
      fullName: user?.fullName || '',
      title: '', summary: '', education: '', experience: '', skills: '', referees: '',
      phone: '', email: user?.primaryEmailAddress?.emailAddress || '', address: '', languages: '', certificates: '', profilePic: ''
    });
    
    setCoverLetter('');
    setHasSignature(false);
    setSignatureDataUrl(null);
    if (canvasRef.current) {
      canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleStep5Next = () => {
    const errors: Record<string, string> = {};
    if (!appRegion.trim()) errors.region = 'Tafadhali jaza mkoa.';
    if (!poBoxNumber.trim()) errors.poBox = 'Tafadhali jaza sanduku la posta.';
    if (!applicantPhone.trim()) errors.phone = 'Tafadhali jaza namba ya simu.';
    if (!coverLetter || !coverLetter.trim() || coverLetter === '<p><br></p>') errors.body = 'Tafadhali andika barua ya maombi.';

    if (Object.keys(errors).length > 0) {
      setStep5Errors(errors);
      toast.error('Tafadhali jaza sehemu zote muhimu zenye alama ya nyota (*).');
      return;
    }
    
    setApplicationStep(6);
  };

  const generateSwahiliTemplate = (job: Job) => {
    return `<p><strong>YAH: MAOMBI YA KAZI YA ${job.jobPosition.toUpperCase()}</strong></p><br/><p>Husika na kichwa cha habari hapo juu.</p><br/><p>Mimi ${user?.fullName || 'Mwombaji'}, naandika barua hii kuomba nafasi ya ${job.jobPosition} katika kampuni yako ya ${job.companyName} kama ilivyotangazwa.</p><br/><p>[Futa hapa na uandike maelezo yako ya ziada kuhusu sifa na uzoefu wako...]</p><br/><p>Natanguliza shukrani zangu za dhati. Nipo tayari kwa usaili muda wowote mtakapohitaji.</p>`;
  };

  const generateEnglishTemplate = (job: Job) => {
    return `<p><strong>REF: APPLICATION FOR ${job.jobPosition.toUpperCase()}</strong></p><br/><p>Dear Hiring Manager,</p><br/><p>I am writing to express my strong interest in the ${job.jobPosition} position at ${job.companyName} as advertised.</p><br/><p>[Delete this and write your additional details about your skills and experience...]</p><br/><p>Thank you for considering my application. I am available for an interview at your earliest convenience.</p>`;
  };

  const handleScheduleInterview = async () => {
    if (!client || !user || !schedulingForApplication) {
        toast.error('Cannot schedule meeting. Missing required information.');
        return;
    }
    
    if (interviewValues.participants.trim()) {
        const emails = interviewValues.participants.split(',').map(e => e.trim()).filter(Boolean);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of emails) {
           if (!emailRegex.test(email)) {
               toast.error(`Barua pepe (Email) si sahihi: ${email}`);
               return;
           }
        }
    }

    setIsScheduling(true);
    try {
        const interviewDateTime = interviewValues.dateTime;
        const durationInMinutes = interviewValues.duration || 60; // Default to 60 mins if not set

        if (durationInMinutes < 30) {
            toast.error("Muda wa usaili hauwezi kuwa chini ya dakika 30.");
            setIsScheduling(false);
            return;
        }

        if (interviewDateTime <= new Date()) {
            toast.error("Cannot schedule an interview in the past.");
            setIsScheduling(false);
            return;
        }
 
        const id = generateUUID();
        const call = client.call('default', id);
        if (!call) throw new Error('Failed to create call');

        const startsAt = interviewDateTime.toISOString();
        const description = interviewValues.description || `Interview for ${schedulingForApplication.jobPosition}`;

        // Mpya: Kokotoa muda wa kuisha interview
        const expiresAt = new Date(interviewDateTime.getTime() + durationInMinutes * 60000).toISOString();

        await call.getOrCreate({
            data: {
                starts_at: startsAt,
                members: [
                    { user_id: user.id, role: 'admin' },
                    { user_id: schedulingForApplication.applicantId, role: 'call_member' }
                ],
                custom: { 
                    description,
                    // Mpya: Ongeza muda wa kuisha na hitaji la malipo kwenye data ya 'call'
                    expires_at: expiresAt,
                    payment_required: true,
                    payment_amount: 5000,
                    payment_currency: 'TZS',
                },
            },
        });
        
        setCallDetails(call);

        const meetingLink = `${window.location.origin}/meeting/${call.id}`;
        // Mpya: Ongeza 'interviewPaid' na 'expiresAt' kwenye Firestore
        await updateDoc(doc(db, 'job_applications', schedulingForApplication.id), {
            interviewScheduled: true,
            interviewDate: startsAt,
            interviewExpiresAt: expiresAt, // Hifadhi muda wa kuisha
            interviewLink: meetingLink,
            interviewerName: user.fullName || user.emailAddresses[0]?.emailAddress,
            interviewerEmail: user.primaryEmailAddress?.emailAddress || '', // Hifadhi email ya bosi
            interviewPaid: false, // Weka alama kuwa hajalipia
        });

        // Mpya: Tuma email kwa mwombaji kumjulisha kuhusu interview
        if (schedulingForApplication.applicantEmail || schedulingForApplication.applicantPhone) {
            try {
                await fetch('/api/send-interview-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: schedulingForApplication.applicantEmail,
                        name: schedulingForApplication.applicantName,
                        applicantPhone: schedulingForApplication.applicantPhone,
                        jobPosition: schedulingForApplication.jobPosition,
                        companyName: schedulingForApplication.companyName,
                        interviewDate: startsAt,
                        interviewLink: meetingLink,
                    })
                });
            } catch (emailError) {
                console.error("Ilishindwa kutuma email ya interview: ", emailError);
                // Usizuie mtiririko, onyesha tu onyo
                toast.warning("Interview scheduled, but failed to send email notification.");
            }
        }

        // Mpya: Tuma notification kwenye mfumo kwa mwombaji
        if (schedulingForApplication.applicantId) {
          addDoc(collection(db, 'notifications'), {
            userId: schedulingForApplication.applicantId,
            title: 'Usaili Umepangwa (Interview Scheduled)',
            message: `Usaili wako wa kazi ya ${schedulingForApplication.jobPosition} kwenye ${schedulingForApplication.companyName} umepangwa. Tume kutumia email yenye link na taarifa zaidi. Tafadhali ingia kwenye dashibodi kulipia.`,
            createdAt: new Date().toISOString(),
            isRead: false,
                type: 'interview_scheduled',
                link: '/personal-room?view=applicant_interviews'
          }).catch(console.error);
        }

        toast.success('Interview scheduled and link generated!');
    } catch (error) {
        console.error('Error creating interview meeting:', error);
        toast.error('Failed to create interview meeting.');
    } finally {
        setIsScheduling(false);
    }
  };

  useEffect(() => {
    // 1. Angalia kama kuna subscription na kama muda wake (masaa 24) haujaisha
    const storedSub = localStorage.getItem('user_subscription');
    let currentPlan = null;
    if (storedSub) {
      const { planId, expiry } = JSON.parse(storedSub);
      if (Date.now() < expiry) {
        setSubscribedPlan(planId);
        currentPlan = planId;
      } else {
        localStorage.removeItem('user_subscription'); // Futa kama muda umeisha
      }
    }


    // 2. Chukua kazi kutoka Firebase Firestore na usikilize mabadiliko (Real-time)
    const q = query(collection(db, 'posted_jobs'), orderBy('createdAt', 'desc'));
    const unsubscribeJobs = onSnapshot(q, (querySnapshot) => {
      const firestoreJobs: Job[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        firestoreJobs.push({
          id: doc.id,
          companyName: data.companyName,
          jobPosition: data.jobPosition,
          description: data.description,
          // Inahakikisha tunapata array, hata kama data ya zamani ilikuwa string
          jobType: data.jobType || 'Full-time', // Mpya: Ongeza aina ya kazi, na default kwa data ya zamani
          qualifications: Array.isArray(data.qualifications) ? data.qualifications : (data.qualifications ? data.qualifications.split(',').map((q: string) => q.trim()) : []),
          deadline: data.deadline,
          logoUrl: data.logoUrl,
          teamImageUrl: data.teamImageUrl,
          contactPhone: data.contactPhone || data.applicationEmail, // Tunachukua pia applicationEmail kuepuka kuharibu kazi za zamani
          companyAddress: data.companyAddress || '', 
          createdBy: data.createdBy,
        });
      });
      setJobs(firestoreJobs);
    }, (error) => {
      console.error("Error fetching jobs from Firestore: ", error);
    });

    // 3. Chukua maombi (requests) kutoka Firebase
    const qApps = query(collection(db, 'job_applications'), orderBy('appliedAt', 'desc'));
    const unsubscribeApps = onSnapshot(qApps, (querySnapshot) => {
      const firestoreApps: Application[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        firestoreApps.push({
          id: doc.id,
          jobId: data.jobId,
          jobPosition: data.jobPosition,
          companyName: data.companyName,
          cvUrl: data.cvUrl,
          cvText: data.cvText,
          linkedInUrl: data.linkedInUrl,
          coverLetter: data.coverLetter,
          appliedAt: data.appliedAt,
          applicantId: data.applicantId,
          applicantName: data.applicantName,
          applicantEmail: data.applicantEmail,
          applicantAddress: data.applicantAddress,
          applicantPhone: data.applicantPhone,
          interviewScheduled: data.interviewScheduled,
          interviewDate: data.interviewDate,
          interviewExpiresAt: data.interviewExpiresAt, // Mpya
          interviewPaid: data.interviewPaid, // Mpya
          interviewLink: data.interviewLink,
          interviewerName: data.interviewerName,
          interviewerEmail: data.interviewerEmail,
          signatureUrl: data.signatureUrl,
          isRead: data.isRead || false,
          interviewCanceled: data.interviewCanceled,
          cancelReason: data.cancelReason,
          penaltyApplied: data.penaltyApplied,
          penaltyAppliedAt: data.penaltyAppliedAt,
          rescheduleRequested: data.rescheduleRequested,
          rescheduleReason: data.rescheduleReason,
          interviewerPenaltyPending: data.interviewerPenaltyPending,
          isAccepted: data.isAccepted || false,
          penaltyPaid: data.penaltyPaid || false,
          refundRequested: data.refundRequested || false,
          refundMethod: data.refundMethod,
          refundAccountDetails: data.refundAccountDetails,
          refundRequestedAt: data.refundRequestedAt,
          employeeDepartment: data.employeeDepartment,
          employeeStatus: data.employeeStatus,
          employeeRole: data.employeeRole,
        });
      });
      setApplications(firestoreApps);
    }, (error) => {
      console.error("Error fetching applications from Firestore: ", error);
    });

    // 4. Chukua Disciplinary Cases kutoka Firebase
    const qCases = query(collection(db, 'disciplinary_cases'), orderBy('createdAt', 'desc'));
    const unsubscribeCases = onSnapshot(qCases, (querySnapshot) => {
      const cases: DisciplinaryCase[] = [];
      querySnapshot.forEach((doc) => {
        cases.push({ id: doc.id, ...doc.data() } as DisciplinaryCase);
      });
      setDisciplinaryCases(cases);
    }, (error) => {
      console.error("Error fetching disciplinary cases: ", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeApps();
      unsubscribeCases();
    };
  }, []);

  // Imeboreshwa muundo wa 'plans' ili kurahisisha usimamizi wa bei na sarafu.
  const plans: Plan[] = [
    {
      title: 'JOB SEARCH PLAN',
      description: 'For individuals starting out.',
      price: 10,
      priceDisplay: '$10/m',
      currency: 'USD',
      benefits: ['Up to 10 participants', 'HD Video', 'Basic support'],
      planId: 'job_search',
      icon: Briefcase,
    },
    {
      title: 'BUSINESS CONFERENCING PLAN',
      description: 'For professionals and small teams.',
      price: 25,
      priceDisplay: '$25/m',
      currency: 'USD',
      benefits: [
        'Up to 50 participants',
        'Full HD Video',
        'Recording',
        'Priority support', 
      ],
      planId: 'business_conferencing',
      icon: Users,
    },
    {
      title: 'EDUCATION CLASSROOM PLAN',
      description: 'For medium-sized companies.',
      price: 50,
      priceDisplay: '$50/m',
      currency: 'USD',
      benefits: ['Up to 100 participants', 'All Pro features', 'Admin dashboard', 'SSO'],
      planId: 'education_classroom',
      icon: BookOpen,
    },
    {
      title: 'GOVERNMENT CONFERENCE PLAN',
      description: 'For large organizations.',
      price: null,
      priceDisplay: 'Contact Us',
      currency: null,
      benefits: ['Unlimited participants', 'All Business features', 'Dedicated support', 'Custom branding'],
      planId: 'government_conference',
      icon: Landmark,
    },
  ];

  // Imeboreshwa 'handleSubscribe' ili ipokee 'plan object' nzima.
  const handleSubscribe = async (plan: Plan) => {
    const { title, price, planId, priceDisplay } = plan;

    if (priceDisplay === 'Contact Us' || price === null) {
      toast.info(`Please contact us for the ${title} plan.`);
      return;
    }

    // Tumepasisha malipo (bypassing payment) ili kuruhusu access ya moja kwa moja
    toast.success(`Successfully subscribed to ${title}!`);
    setSubscribedPlan(planId);
    
    // Weka muda wa kuisha kwa subscription (Masaa 24 kuanzia sasa)
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('user_subscription', JSON.stringify({ planId, expiry }));

    // Tuma notification na Email / SMS ya Risiti
    if (user?.id) {
      addDoc(collection(db, 'notifications'), {
        userId: user.id,
        title: 'Kifurushi Kimeamilishwa (Subscription Active)',
        message: `Umefanikiwa kulipia kifurushi cha ${title}. Risiti na maelezo yametumwa kwenye barua pepe yako.`,
        createdAt: new Date().toISOString(),
        isRead: false,
        type: 'payment_success',
        link: planId === 'business_conferencing' ? '/personal-room?view=business_dashboard' : '/personal-room?view=job_dashboard'
      }).catch(console.error);
    }

    try {
      const res = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName || 'Mteja',
          phone: '', 
          amount: price,
          currency: plan.currency || 'USD',
          description: `Malipo ya Kifurushi: ${title}`,
          receiptNumber: `SUB-${Math.floor(Math.random() * 1000000)}`,
          date: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindwa kutuma risiti');
    } catch (error: any) {
      console.error(error);
      // Hapa sasa itakuonyesha kosa halisi lililofanya ishindwe kutuma
      toast.error(`Risiti Imefeli: ${error.message}`);
    }
  };

  const handleOpenNow = (planId: string) => {
    if (planId === 'job_search') {
      setActiveView('job_dashboard');
    } else if (planId === 'business_conferencing') {
      setActiveView('business_dashboard');
    } else {
      toast.info(`Dashboard for this plan is coming soon!`);
    }
  };

  // Mpya: Logic ya kushughulikia malipo ya interview
  const handleInterviewPayment = async (applicationId: string) => {
    setIsProcessingPayment(applicationId);
    try {
      const app = applications.find(a => a.id === applicationId);

      // ENEO LA KUUNGANISHA MFUMO HALISI WA MALIPO:
      // Hapa ndipo utaita API yako kupeleka user kwenye ukurasa wa malipo (k.m. Pesapal, Selcom, Flutterwave)
      // Mfano: 
      // const response = await fetch('/api/initiate-payment', { method: 'POST', body: JSON.stringify({ appId: applicationId, amount: 5000 }) });
      // const data = await response.json();
      // window.location.href = data.paymentUrl;

      // KWA SASA (KWA AJILI YA TESTING): Tunabadilisha 'interviewPaid' kuwa 'true' moja kwa moja kwenye Firebase
      await updateDoc(doc(db, 'job_applications', applicationId), {
        interviewPaid: true
      });
      toast.success('Malipo yamefanikiwa! Sasa unaweza kujiunga na interview.');

      // Tuma Notification ya mfumo
      if (user?.id) {
        addDoc(collection(db, 'notifications'), {
          userId: user.id,
          title: 'Malipo Yamefanikiwa (Interview Paid)',
          message: `Umefanikiwa kulipia TZS 5,000 kwa ajili ya usaili wa kazi ya ${app?.jobPosition || 'hiyo'} kwenye ${app?.companyName || 'kampuni'}. Risiti imetumwa kwenye email yako.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          type: 'payment_success',
          link: '/personal-room?view=applicant_interviews'
        }).catch(console.error);
      }

      // Tuma Risiti (SMS, Email Mteja, Email UYAO)
      try {
        const res = await fetch('/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.primaryEmailAddress?.emailAddress,
            name: user?.fullName || 'Mteja',
            phone: app?.applicantPhone || '', 
            amount: 5000,
            currency: 'TZS',
            description: `Malipo ya Usaili (Interview) - ${app?.jobPosition || ''} (${app?.companyName || ''})`,
            receiptNumber: `RCP-${Math.floor(Math.random() * 1000000)}`,
            date: new Date().toISOString()
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Imeshindwa kutuma risiti');
      } catch (error: any) {
        console.error(error);
        toast.error(`Risiti Imefeli: ${error.message}`);
      }
    } catch (error) {
      console.error('Hitilafu kwenye malipo:', error);
      toast.error('Malipo yameshindwa. Tafadhali jaribu tena.');
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingApplication) return;
    setIsProcessingCancel(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        cancelReason: cancelReason,
        rescheduleRequested: false, // Futa pending request ya no-show (kama ipo) maana anajibu/anapanga
      };
      
      if (willReschedule) {
        // Hakikisha client ipo (Hii inatatua lile kosa la TypeScript "client is possibly undefined")
        if (!client) {
          toast.error('Mfumo wa video haujakaa sawa, tafadhali jaribu tena.');
          setIsProcessingCancel(false);
          return;
        }
        const startsAt = rescheduleDateTime.toISOString();
        const durationInMinutes = 60;
        const expiresAt = new Date(rescheduleDateTime.getTime() + durationInMinutes * 60000).toISOString();
        const id = generateUUID();
        
        let attempts = 0;
        let success = false;

        // Tengeneza meeting mpya kwenye Stream badala ya kutumia ile ya zamani
        while (attempts < 3 && !success) {
            try {
                const newCall = client.call('default', id);
                await newCall.getOrCreate({
                    data: {
                        starts_at: startsAt,
                        members: [
                            { user_id: user?.id || '', role: 'admin' },
                            { user_id: cancelingApplication.applicantId, role: 'call_member' }
                        ],
                        custom: { 
                            description: `Rescheduled Interview for ${cancelingApplication.jobPosition}`,
                            expires_at: expiresAt,
                            payment_required: true,
                            payment_amount: 5000,
                            payment_currency: 'TZS',
                        },
                    },
                });
                success = true;
            } catch (err) {
                attempts++;
                if (attempts >= 3) throw err;
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        const meetingLink = `${window.location.origin}/meeting/${id}`;

        updateData.interviewDate = startsAt;
        updateData.interviewExpiresAt = expiresAt;
        updateData.interviewLink = meetingLink;
        updateData.interviewCanceled = false; 
        updateData.interviewerPenaltyPending = false; // Amesamehewa maana amepanga upya mapema
        updateData.rescheduleRequested = false; // Imetatuliwa

        // Tuma email na SMS kwa muombaji (Applicant) kuhusu Reschedule
        try {
          await fetch('/api/send-reschedule-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicantName: cancelingApplication.applicantName,
              applicantEmail: cancelingApplication.applicantEmail,
              applicantPhone: cancelingApplication.applicantPhone,
              jobPosition: cancelingApplication.jobPosition,
              companyName: cancelingApplication.companyName,
              newDate: startsAt,
              reason: cancelReason,
              meetingLink: meetingLink
            })
          });
        } catch (emailError) {
          console.error("Ilishindwa kutuma email/sms ya reschedule: ", emailError);
        }
      } else {
        // Tuma Notification kwa Mwombaji kumjulisha cancellation
        if (cancelingApplication.applicantId) {
          addDoc(collection(db, 'notifications'), {
            userId: cancelingApplication.applicantId,
            title: 'Usaili Umesitishwa (Interview Canceled)',
            message: `Usaili wako wa kazi ya ${cancelingApplication.jobPosition} kwenye ${cancelingApplication.companyName} umesitishwa. Sababu: "${cancelReason}". Kama ulilipia usaili, tafadhali ingia kwenye dashibodi yako kuomba kurudishiwa pesa (Refund).`,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'cancellation',
            link: '/personal-room?view=applicant_interviews'
          }).catch(console.error);
        }

        updateData.interviewScheduled = false; // Inarudi kwenye requests ili isimamiwe kivingine
        updateData.interviewCanceled = true;
        updateData.penaltyApplied = true; // Faini ya 10,000 TZS inarekodiwa kwenye mfumo
        updateData.penaltyAppliedAt = new Date().toISOString(); // Tarehe rasmi ya faini

        // Tuma Notification kwa Boss kumjulisha faini
        const job = jobs.find(j => j.id === cancelingApplication.jobId);
        if (job?.createdBy) {
          addDoc(collection(db, 'notifications'), {
            userId: job.createdBy,
            title: 'Faini Imetozwa (Penalty Applied)',
            message: `Umetozwa faini ya TZS 10,000 kwa kusitisha usaili na ${cancelingApplication.applicantName} bila sababu za msingi au kupanga siku nyingine. Sababu uliyotoa: "${cancelReason}"`,
            createdAt: new Date().toISOString(),
            isRead: false,
            type: 'penalty',
            link: '/personal-room?view=business_penalties'
          }).catch(console.error);
        }

        // Tuma email kwa admin na muombaji kuhusu faini/cancellation
        try {
          await fetch('/api/cancel-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicantName: cancelingApplication.applicantName,
              applicantEmail: cancelingApplication.applicantEmail, // Mpya: Tuma email ya muombaji kwenye API
              applicantPhone: cancelingApplication.applicantPhone, // Tuma Namba ya simu kwa ajili ya SMS
              employerPhone: job?.contactPhone, // Tuma namba ya muajiri kwa ajili ya taarifa ya faini
              jobPosition: cancelingApplication.jobPosition,
              companyName: cancelingApplication.companyName,
              cancelReason: cancelReason,
              canceledBy: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Muandaaji'
            })
          });
        } catch (emailError) {
          console.error("Ilishindwa kutuma email ya cancellation: ", emailError);
        }
      }

      await updateDoc(doc(db, 'job_applications', cancelingApplication.id), updateData);
      toast.success(willReschedule ? 'Interview rescheduled successfully.' : 'Interview canceled. Penalty of 10,000 TZS applied.');
      setIsCancelingInterview(false);
    } catch (e) {
      console.error('Error canceling interview:', e);
      toast.error('Failed to process cancellation.');
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleRequestReschedule = async (appId: string) => {
      setIsRequestingReschedule(appId);
      try {
          await updateDoc(doc(db, 'job_applications', appId), {
              rescheduleRequested: true,
              rescheduleReason: "Interviewer No-Show",
              interviewerPenaltyPending: true
          });

          // Tuma Notification kwa Boss kumpa onyo
          const app = applications.find(a => a.id === appId);
          const job = jobs.find(j => j.id === app?.jobId);
          if (job?.createdBy && app) {
              addDoc(collection(db, 'notifications'), {
                  userId: job.createdBy,
                  title: 'Onyo la Faini (No-Show Warning)',
                  message: `Mwombaji ${app.applicantName} ameripoti kuwa hukuhudhuria usaili uliopangwa. Tafadhali panga siku nyingine ya kikao ndani ya mfumo haraka au utatozwa faini ya TZS 10,000.`,
                  createdAt: new Date().toISOString(),
                  isRead: false,
                  type: 'penalty_warning',
                  link: '/personal-room?view=business_scheduled_interviews'
              }).catch(console.error);
          }
          toast.success('Ombi la kupangiwa kikao kipya limetumwa kikamilifu.');
      } catch(e) {
          console.error(e);
          toast.error('Imeshindwa kutuma ombi.');
      } finally {
          setIsRequestingReschedule(null);
      }
  };

  const handleInitiateDisciplinary = async (emp: Employee) => {
    if (!user?.id) return;
    const existing = disciplinaryCases.find(c => c.employeeAppId === emp.appId && c.step < 5);
    if (existing) {
      toast.error("Mfanyakazi huyu tayari ana kesi inayoendelea.");
      return;
    }
    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const docRef = await addDoc(collection(db, 'disciplinary_cases'), {
        employerId: user.id,
        employeeAppId: emp.appId,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        employeeDept: emp.department,
        employeeAvatar: emp.avatar,
        caseNumber: caseNumber,
        step: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        documents: [],
        wsodUploaded: false
      });
      toast.success("Kesi ya kinidhamu imeanzishwa kikamilifu.");
      setActiveCaseId(docRef.id);
      setActiveView('admin_disciplinary_cases');
    } catch (e) {
      console.error(e);
      toast.error("Imeshindwa kuanzisha kesi.");
    }
  };

  if (activeView === 'job_dashboard') {
    // Hesabu idadi ya interviews ambazo mwombaji amepangiwa
    const myInterviewsCount = mySentApplications.filter(app => app.interviewScheduled).length;
    const myAcceptedCount = mySentApplications.filter(app => app.isAccepted).length;

    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('plans')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Plans
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Job Search Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mt-2">
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-blue-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('job_posted_list')}
          >
            <Briefcase className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Job Posted</h3>
            <p className="mt-2 text-4xl font-extrabold text-blue-400">{jobs.filter(j => new Date(j.deadline) >= new Date()).length}</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-yellow-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('applicant_interviews')}
          >
            <Users className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">My Interviews</h3>
            <p className="mt-2 text-4xl font-extrabold text-yellow-400">{myInterviewsCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-green-500 transition-all cursor-pointer text-center">
            <Check className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Result / Accepted</h3>
            <p className="mt-2 text-4xl font-extrabold text-green-400">{myAcceptedCount}</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-purple-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('employee_dashboard')}
          >
            <UserCog className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Employee Portal</h3>
            <p className="mt-2 text-sm font-medium text-gray-400 text-center">My Workplace / Kazini</p>
          </div>
        </div>
      </section>
    );
  }

  if (activeView === 'applicant_interviews') {
    const myInterviews = mySentApplications.filter(app => app.interviewScheduled);

    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('job_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">My Scheduled Interviews</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myInterviews.length === 0 ? (
            <p className="text-gray-400">You have no scheduled interviews yet.</p>
          ) : (
            myInterviews.map((app) => {
              const now = new Date();
              const hasExpired = app.interviewExpiresAt && now > new Date(app.interviewExpiresAt);
              return (
              <div key={app.id} className="flex flex-col gap-4 rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-lg hover:border-blue-500 transition-all">
                <div>
                  <h3 className="text-xl font-bold text-white">Position: {app.jobPosition}</h3>
                  <p className="text-sm text-blue-400 font-medium">{app.companyName}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <p className="text-sm text-gray-300 mb-2"><span className="font-semibold text-gray-200">Date & Time:</span> {new Date(app.interviewDate!).toLocaleString()}</p>
                  <p className="text-sm text-gray-300 mb-2"><span className="font-semibold text-gray-200">Interviewer:</span> {app.interviewerName}</p>
                  
                  {app.interviewCanceled ? (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3 items-center text-center">
                      <p className="text-sm text-red-400 font-bold uppercase tracking-widest">Cancelled (Imesitishwa)</p>
                      <p className="text-xs text-gray-300">Sababu: {app.cancelReason}</p>

                      {app.interviewPaid ? (
                        app.refundRequested ? (
                          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center w-full">
                             <p className="text-xs text-yellow-400 font-semibold">Ombi lako la kurudishiwa pesa (Refund) linashughulikiwa kupitia: <strong>{app.refundMethod === 'account' ? 'Akaunti/Namba ya Simu' : 'Kupunguziwa Kwenye Subscription'}</strong>.</p>
                             <p className="text-[10px] text-gray-400 mt-1">Itachukua wiki 2 hadi mwezi 1 kukamilika, baada ya UYAO kufanya makato kwa mwajiri (TZS 5,000).</p>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setApplicationForRefund(app);
                              setRefundMethod('account');
                              setRefundAccountDetails('');
                              setIsRequestingRefund(true);
                            }}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors w-full shadow-lg mt-2"
                          >
                            Omba Kurudishiwa Pesa (Request Refund)
                          </button>
                        )
                      ) : (
                        <p className="text-xs text-gray-500 font-semibold mt-2">Hukufanya malipo kwa usaili huu, hivyo hakuna pesa itakayorudishwa (No right to refund).</p>
                      )}
                    </div>
                  ) : hasExpired ? (
                    app.rescheduleRequested ? (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col gap-3 items-center text-center">
                        <p className="text-sm text-blue-400 font-semibold">Umeshatuma ombi la kupangiwa kikao kipya. Tafadhali subiri majibu kutoka kwa kampuni.</p>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex flex-col gap-3 items-center text-center">
                        <p className="text-sm text-yellow-400 font-semibold">Muda wa kikao umeisha. Kama muandaaji hakuhudhuria (No-Show), unaweza kuomba kupangiwa siku nyingine bila malipo ya ziada.</p>
                        <button 
                          onClick={() => handleRequestReschedule(app.id)}
                          disabled={isRequestingReschedule === app.id}
                          className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors w-full shadow-lg disabled:opacity-50"
                        >
                          {isRequestingReschedule === app.id ? 'Inatuma...' : 'Omba Kikao Kipya (Request Reschedule)'}
                        </button>
                      </div>
                    )
                  ) : !app.interviewPaid ? (
                    (() => {
                        // Tafuta muda wa mwisho wa kulipia (Masaa 2 kabla ya interview)
                        const paymentDeadline = new Date(new Date(app.interviewDate!).getTime() - 2 * 60 * 60 * 1000);
                        const timeToDeadline = paymentDeadline.getTime() - currentTime.getTime();
                        const hoursLeft = Math.floor(timeToDeadline / (1000 * 60 * 60));
                        const minutesLeft = Math.floor((timeToDeadline % (1000 * 60 * 60)) / (1000 * 60));

                        if (timeToDeadline <= 0) {
                            return (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3 items-center text-center">
                                    <p className="text-sm text-red-400 font-bold uppercase">Muda Wa Malipo Umeisha</p>
                                    <p className="text-[11px] text-gray-300">Kikao chako kimesitishwa kwa kushindwa kufanya malipo ndani ya masaa 2 kabla ya usaili.</p>
                                </div>
                            );
                        }
                        return (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3 items-center text-center">
                              <p className="text-sm text-red-400 font-semibold">Payment of TZS 5,000 is required to join this interview.</p>
                              <div className="bg-red-500/20 px-4 py-3 rounded-xl border border-red-500/50 w-full text-center shadow-inner">
                                <p className="text-[11px] text-gray-200 font-bold mb-1 uppercase tracking-widest">Muda uliobaki wa Kulipia</p>
                                <p className="text-3xl font-black text-red-400 animate-pulse">{hoursLeft}h {minutesLeft}m</p>
                                <p className="text-[10px] text-gray-400 mt-1">Usipolipia, kikao kitasitishwa moja kwa moja masaa 2 kabla.</p>
                              </div>
                              <button onClick={() => handleInterviewPayment(app.id)} disabled={isProcessingPayment === app.id} className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-xl transition-all w-full shadow-lg disabled:opacity-50 disabled:cursor-wait mt-1">
                                {isProcessingPayment === app.id ? 'Inachakata (Processing)...' : 'Lipa Sasa (Pay TZS 5,000)'}
                              </button>
                            </div>
                        );
                    })()
                  ) : (
                    <div className="mt-4">
                      <a href={app.interviewLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg">
                        Join Interview
                      </a>
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </section>
    );
  }

  if (activeView === 'job_posted_list') {
    const filteredJobs = jobs.filter(job => 
      new Date(job.deadline) >= new Date() &&
      ((job.jobPosition.toLowerCase().includes(searchJobQuery.toLowerCase()) || 
      job.companyName.toLowerCase().includes(searchJobQuery.toLowerCase())) &&
      (jobTypeFilter === 'All' || job.jobType === jobTypeFilter))
    );

    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('job_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Available Jobs</h1>
        </div>

        {/* Sehemu ya Kutafuta Kazi */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by job position or company name..." 
              value={searchJobQuery}
              onChange={(e) => setSearchJobQuery(e.target.value)}
              className="w-full rounded-lg bg-gray-800 py-3 pl-10 pr-4 text-white border border-gray-700 focus:border-blue-500 focus:outline-none shadow-sm"
            />
          </div>
          <div className="relative flex-shrink-0">
            <select 
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="w-full md:w-auto rounded-lg bg-gray-800 py-3 px-4 text-white border border-gray-700 focus:border-blue-500 focus:outline-none shadow-sm"
            >
              <option value="All">All Job Types</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
              <option>Temporary</option>
            </select>
          </div>
        </div>

        {/* CSS ya kuifanya poster ijivute na kutoshea kwenye simu */}
        {/* CSS ya kuifanya poster ijivute na kutoshea vizuri kwenye simu zote */}
        <style dangerouslySetInnerHTML={{__html: `
          .responsive-poster { zoom: 0.55; }
          @media (min-width: 640px) { .responsive-poster { zoom: 0.7; } }
          @media (min-width: 850px) { .responsive-poster { zoom: 0.8; } }
          .responsive-poster { zoom: 0.35; }
          @media (min-width: 360px) { .responsive-poster { zoom: 0.38; } }
          @media (min-width: 400px) { .responsive-poster { zoom: 0.42; } }
          @media (min-width: 480px) { .responsive-poster { zoom: 0.5; } }
          @media (min-width: 640px) { .responsive-poster { zoom: 0.65; } }
          @media (min-width: 850px) { .responsive-poster { zoom: 0.85; } }
          @media (min-width: 1024px) { .responsive-poster { zoom: 1; } }
          @-moz-document url-prefix() {
             .responsive-poster { transform: scale(0.55); transform-origin: top center; margin-bottom: -45%; }
             @media (min-width: 640px) { .responsive-poster { transform: scale(0.7); margin-bottom: -30%; } }
             @media (min-width: 850px) { .responsive-poster { transform: scale(0.8); margin-bottom: -20%; } }
             .responsive-poster { transform: scale(0.35); transform-origin: top center; margin-bottom: -65%; }
             @media (min-width: 360px) { .responsive-poster { transform: scale(0.38); margin-bottom: -62%; } }
             @media (min-width: 400px) { .responsive-poster { transform: scale(0.42); margin-bottom: -58%; } }
             @media (min-width: 480px) { .responsive-poster { transform: scale(0.5); margin-bottom: -50%; } }
             @media (min-width: 640px) { .responsive-poster { transform: scale(0.65); margin-bottom: -35%; } }
             @media (min-width: 850px) { .responsive-poster { transform: scale(0.85); margin-bottom: -15%; } }
             @media (min-width: 1024px) { .responsive-poster { transform: scale(1); margin-bottom: 0; } }
          }
        `}} />

        {/* Sehemu ya Kuonyesha Kazi Zilizopostiwa (Available Jobs) */}
        <div className="flex flex-col items-center gap-10">
          {filteredJobs.length === 0 ? (
            <p className="text-gray-400">No jobs found matching your search.</p>
          ) : (
            filteredJobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              const hasApplied = applications.some(app => app.jobId === job.id && app.applicantId === user?.id);

              if (!isExpanded) {
                return (
                  <div key={job.id} onClick={() => setExpandedJobId(job.id)} className="w-full max-w-4xl mx-auto rounded-3xl border border-gray-700 bg-gray-800/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all shadow-lg group">
                    <div className="flex items-center gap-6 w-full">
                      {job.logoUrl ? (
                        <img src={job.logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-contain bg-white shadow-inner p-1" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gray-700 flex items-center justify-center shadow-inner">
                          <Briefcase size={32} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{job.jobPosition}</h3>
                        <p className="text-gray-400 font-medium text-lg">{job.companyName} &bull; <span className="text-yellow-500">{job.jobType}</span></p>
                        <p className="text-sm text-red-400 mt-1 flex items-center gap-1"><Calendar size={14}/> Mwisho: {new Date(job.deadline).toLocaleDateString('sw-TZ')}</p>
                        {hasApplied && <p className="text-sm text-green-400 mt-1 font-bold flex items-center gap-1"><Check size={14}/> Umeshaomba</p>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto">
                      <button className="w-full md:w-auto px-8 py-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-600/50 group-hover:bg-blue-600 group-hover:text-white font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2">
                        Soma Zaidi <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                );
              }

              // Sehemu ya tangazo itakayokuwa PDF
              const JobPoster = (
                <div className="w-full overflow-hidden flex justify-center pb-6" style={{ backgroundColor: '#f8fafc', color: '#1f2937', borderColor: '#f8fafc', boxShadow: 'none', textShadow: 'none' }}>
                  <div id={`job-poster-${job.id}`} className="w-[800px] min-h-[1131px] font-sans relative overflow-hidden shrink-0 flex flex-col responsive-poster" style={{ backgroundColor: '#f8fafc', color: '#1f2937' }}>
                    
                    {/* A: Logo na Jina la Kampuni (Juu Kushoto) */}
                    <div className="absolute top-10 left-6 z-20 flex flex-col items-center w-[220px]">
                      {job.logoUrl ? (
                        <img src={job.logoUrl} alt="Logo" className="w-28 h-28 object-contain" />
                      ) : (
                        <div className="w-28 h-28 backdrop-blur-md rounded-2xl border flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
                          <Briefcase size={40} style={{ color: '#ffffff' }} />
                        </div>
                      )}
                      <h2 
                        className="font-bold mt-4 text-center uppercase tracking-widest w-full leading-tight backdrop-blur-sm px-3 py-1.5 rounded-lg"
                        style={{ fontSize: job.companyName.length > 15 ? '0.9rem' : '1.1rem', color: '#111827', backgroundColor: 'rgba(255,255,255,0.8)' }}
                        title={job.companyName}
                      >
                        {job.companyName}
                      </h2>
                    </div>

                    {/* B: NAFASI ZA KAZI & WE ARE HIRING */}
                    <div className="relative z-10 pt-16 ml-[190px] flex flex-col items-center justify-center pr-10">
                      <div className="relative px-8 py-3 mb-4" style={{ backgroundColor: '#1e3a8a' }}>
                        {/* Nusu Mstatili wa Gold (Juu Kulia) */}
                        <div className="absolute -top-3 -right-3 w-8 h-8 border-t-4 border-r-4 border-yellow-500" style={{ borderColor: '#eab308' }}></div>
                        {/* Nusu Mstatili wa Gold (Chini Kushoto) */}
                        <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-4 border-l-4 border-yellow-500" style={{ borderColor: '#eab308' }}></div>
                        <h1 className="text-4xl font-black tracking-widest uppercase" style={{ color: '#ffffff' }}>Nafasi za Kazi</h1>
                      </div>
                      <h2 className="text-3xl font-extrabold tracking-[0.4em] uppercase mb-8 text-center" style={{ color: '#2563eb' }}>We Are Hiring</h2>
                    </div>

                    {/* C: Picha ya Timu/Mandhari (Iliyoundwa kisasa) */}
                    <div className="relative z-10 px-12 mb-8">
                      <div className="relative">
                        {/* Urembo wa kivuli cha bluu nyuma ya picha */}
                        <div className="absolute inset-0 bg-blue-600 rounded-[2rem] transform translate-x-3 translate-y-3 opacity-20" style={{ backgroundColor: '#2563eb' }}></div>
                        {/* Picha itatumia ile aliyoupload, ikikosekana itaita ile function yetu na kujaza kulingana na jina la kazi */}
                        <img src={job.teamImageUrl || getFallbackImage(job.jobPosition)} alt="Team" className="relative w-full h-[320px] object-cover rounded-[2rem] border-4" style={{ borderColor: '#ffffff' }} />
                      </div>
                    </div>

                    {/* Taarifa Zilizobaki */}
                    <div className="px-12 relative z-10 flex-grow pb-10">
                      
                      {/* D: Nafasi Husika ya Kazi (Na Icon ya Briefcase kwenye kiduara) */}
                      <div className="mb-6 p-5 rounded-2xl border" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                            <Briefcase size={28} />
                          </div>
                          <h3 className="text-2xl font-black uppercase tracking-widest" style={{ color: '#1f2937' }}>Nafasi Husika Ya Kazi</h3>
                        </div>
                        <div className="ml-[72px] flex items-center flex-wrap gap-4 mt-1">
                          <h4 className="text-3xl font-bold" style={{ color: '#2563eb' }}>{job.jobPosition}</h4>
                          <span className="border px-4 py-1 rounded-full text-sm font-bold tracking-widest uppercase" style={{ backgroundColor: '#dbeafe', borderColor: '#bfdbfe', color: '#1e40af' }}>
                            {job.jobType}
                          </span>
                        </div>
                      </div>

                      {/* E: Maelezo Mafupi ya Kazi */}
                      <div className="mb-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                            <FileText size={20} />
                          </div>
                          <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: '#111827' }}>Maelezo ya Kazi</h3>
                        </div>
                        <p className="text-lg leading-relaxed whitespace-pre-line break-words text-justify ml-[56px] pr-4" style={{ color: '#374151' }}>{job.description}</p>
                      </div>

                      {/* F: Vigezo na Sifa */}
                      <div className="mb-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            <Check size={20} />
                          </div>
                          <h3 className="text-xl font-bold uppercase tracking-widest" style={{ color: '#111827' }}>Vigezo na Sifa</h3>
                        </div>
                        <ul className="grid grid-cols-1 gap-3 ml-[56px]">
                          {job.qualifications.map((q, index) => (
                            <li key={index} className="flex items-start gap-4 text-lg" style={{ color: '#374151' }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                <Check size={14} strokeWidth={4} />
                              </div>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* FOOTER SECTION - Imebadilishwa kutumia mt-auto kuepuka kuingiliana na content ndefu */}
                    <div className="mt-auto relative w-full z-20 flex flex-col">
                      {/* F: Mwisho wa Maombi (Bango la Orange) */}
                      <div className="w-full h-[150px] flex items-end relative">
                        <div className="w-[45%] h-[120px] rounded-tr-[4rem] flex items-center px-8 relative z-20" style={{ background: 'linear-gradient(to right, #f97316, #ef4444)' }}>
                          <div style={{ color: '#ffffff' }}>
                            <p className="text-sm uppercase tracking-widest font-bold opacity-90 mb-1 flex items-center gap-2"><Calendar size={18}/> Mwisho wa Maombi</p>
                            <p className="text-xl sm:text-2xl font-black">{new Date(job.deadline).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>

                        {/* G: Mawasiliano na Anuani (Bango la Chini - Brand Color) */}
                        <div className="absolute bottom-0 right-0 w-[70%] h-[140px] rounded-tl-[4rem] flex flex-col justify-center items-end pr-10 pl-28 z-10" style={{ backgroundColor: '#1f2937' }}>
                          <div className="flex flex-row justify-end items-start gap-6 w-full" style={{ color: '#ffffff' }}>
                            {/* Mawasiliano */}
                            <div className="flex flex-col items-end text-right mt-1 shrink-0">
                              <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#9ca3af' }}>Mawasiliano</p>
                              <p className="text-lg sm:text-xl font-black flex items-center gap-2 tracking-wide whitespace-nowrap"><PhoneCall size={20} style={{ color: '#fb923c' }} /> {job.contactPhone || "+255 000 000 000"}</p>
                            </div>
                            
                            {/* Anuani block */}
                            <div className="flex flex-col items-start text-left border-l-2 pl-5 max-w-[240px]" style={{ borderLeftColor: 'rgba(75, 85, 99, 0.5)' }}>
                              <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1" style={{ color: '#9ca3af' }}>
                                <MapPin size={12} style={{ color: '#fb923c' }} /> Anuani Rasmi
                              </p>
                              <div className="text-xs font-medium text-gray-200 leading-tight" style={{ color: '#e5e7eb' }}>
                                <p className="font-bold mb-1 uppercase" style={{ color: '#ffffff' }}>{job.companyName}</p>
                                {(job.companyAddress || "Dar es Salaam, Tanzania")
                                  .replace(/(P\.?O\.?\s*Box|S\.?L\.?P\.?|Sanduku\s+la\s+posta)\s*,\s*/gi, '$1 ')
                                  .split(/,|\n/)
                                  .map((line, i) => {
                                    const trimmed = line.trim();
                                    const formattedLine = trimmed.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                                    return formattedLine ? <p key={i}>{formattedLine}</p> : null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* H: UYAO Footer & Maelezo ya Kuomba */}
                    <div className="w-full h-[100px] border-t-4 flex flex-col items-center justify-center relative z-30" style={{ backgroundColor: '#ffffff', borderTopColor: '#f3f4f6' }}>
                      <p className="font-bold text-lg mb-2 flex items-center gap-2" style={{ color: '#1f2937' }}>
                        Tafadhali tumia kitufe cha <span className="px-3 py-1 rounded-full flex items-center gap-1 text-sm" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}><MousePointerClick size={16}/> Apply Now</span> kutuma maombi.
                      </p>
                      <div className="inline-block px-6 py-1 rounded-full border" style={{ backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' }}>
                        <p className="text-xs font-black tracking-[0.2em] uppercase" style={{ color: '#6b7280' }}>UYAO &bull; Your Gateway to Opportunities</p>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              );

              return (
                <div key={job.id} className="flex flex-col gap-4 w-full max-w-4xl mx-auto rounded-3xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-3 sm:p-8 shadow-2xl overflow-hidden">
                  {JobPoster}
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <button onClick={() => handleDownloadJobAsPDF(job.id, job.jobPosition, job.companyName)} disabled={isDownloading === job.id} className="flex-1 px-4 sm:px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-black text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-2 sm:gap-3 border border-emerald-400/50 group disabled:opacity-50 disabled:cursor-wait">
                      <span className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                        <FileText size={20} className="text-white" />
                      </span>
                      <span className="text-base sm:text-xl tracking-wide uppercase">{isDownloading === job.id ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                    <button 
                      onClick={() => { 
                        setApplyingJob(job); 
                        setApplicationStep(1); 
                        setCvFile(null); 
                          setCvText('');
                        setLinkedInUrl(''); 
                        setCoverLetter(generateSwahiliTemplate(job)); 
                        setIsBuildingCV(false);
                        setCoverLetterLanguage('sw');
                        setPoBoxNumber('');
                        setAppRegion('');
                        setStep5Errors({});
                        setAttachmentFiles([]);
                        setCvData({
                          fullName: user?.fullName || '',
                          title: '', summary: '', education: '', experience: '', skills: '', referees: '',
                          phone: '', email: user?.primaryEmailAddress?.emailAddress || '', address: '', languages: '', certificates: '', profilePic: ''
                        });
                      }} 
                      disabled={hasApplied}
                      className={`flex-1 px-4 sm:px-6 py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 sm:gap-3 border group ${hasApplied ? 'bg-gray-700 border-gray-600 cursor-not-allowed text-gray-300' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] hover:-translate-y-1 border-blue-400/50'}`}
                    >
                      <span className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                         {hasApplied ? <Check size={20} className="text-green-400" /> : <Send size={20} className="text-white" />}
                      </span>
                      <span className="text-base sm:text-xl tracking-wide uppercase">{hasApplied ? 'Umeshaomba' : 'Apply Now'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal ya Ku-Apply Kazi */}
        {applyingJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-2xl scrollbar-hide">
              <button 
                onClick={closeApplicationModal}
                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="mb-2 text-2xl font-bold text-white">Apply for {applyingJob.jobPosition}</h2>
              <p className="mb-6 text-sm text-blue-400">{applyingJob.companyName}</p>

              {/* Fomu ya Hatua kwa Hatua */}
              <form className="flex flex-col gap-4">
                {applicationStep === 1 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 1: Weka CV Yako</h3>
                    
                    <div className="flex flex-col gap-4">
                      <div className="p-5 border border-gray-700 rounded-xl bg-gray-800/50">
                         <h4 className="font-bold text-white mb-3">Chaguo A: Pakia CV (PDF/DOC) au Weka LinkedIn</h4>
                         <div className="flex flex-col gap-3">
                            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files ? e.target.files[0] : null)} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                            <div className="flex items-center justify-center"><span className="text-gray-500 font-black text-xs uppercase tracking-widest">AU</span></div>
                            <input type="url" placeholder="LinkedIn Profile Link (e.g. https://linkedin.com/in/jina)" value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                         </div>
                      </div>

                      <div className="flex items-center justify-center"><span className="text-gray-500 font-black text-xs tracking-widest uppercase">AU (OR)</span></div>

                      <div className="p-5 border border-blue-500/50 rounded-xl bg-blue-900/10 text-center">
                         <h4 className="font-bold text-white mb-2">Chaguo B: Huna CV? Tengeneza Sasa</h4>
                         <p className="text-sm text-gray-300 mb-4">Jaza fomu fupi na mfumo utakutengenezea CV yenye muonekano mzuri (Template) papo hapo.</p>
                         <button type="button" onClick={() => { setIsBuildingCV(true); setApplicationStep(2); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all w-full md:w-auto">
                           📝 Andika CV Yako Sasa (Build CV)
                         </button>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                      <button type="button" onClick={closeApplicationModal} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition-colors">Cancel</button>
                      <button type="button" onClick={() => { setIsBuildingCV(false); setApplicationStep(4); }} disabled={!cvFile && !linkedInUrl.trim()} className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next (Attachments)</button>
                    </div>
                  </>
                )}

                {applicationStep === 2 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 2: Jaza Taarifa za CV</h3>
                    <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="flex flex-col gap-2 sm:col-span-2 mb-2">
                           <label className="text-sm text-gray-300">Picha Yako (Profile Picture) - Hiari lakini ni muhimu</label>
                           <input type="file" accept="image/*" onChange={(e) => {
                             if (e.target.files && e.target.files[0]) {
                               const reader = new FileReader();
                               reader.onload = (ev) => setCvData({ ...cvData, profilePic: ev.target?.result as string });
                               reader.readAsDataURL(e.target.files[0]);
                             }
                           }} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Jina Kamili</label>
                           <input type="text" value={cvData.fullName} onChange={e => setCvData({...cvData, fullName: e.target.value})} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600" placeholder="Mfano: John Doe" />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Cheo chako</label>
                           <input type="text" value={cvData.title} onChange={e => setCvData({...cvData, title: e.target.value})} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600" placeholder="Mfano: Marketing Strategist / Daktari" />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Namba ya Simu</label>
                           <input type="text" value={cvData.phone} onChange={e => setCvData({...cvData, phone: e.target.value})} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600" placeholder="Mfano: +255 700 000 000" />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Barua Pepe (Email)</label>
                           <input type="email" value={cvData.email} onChange={e => setCvData({...cvData, email: e.target.value})} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600" placeholder="Mfano: jina@email.com" />
                         </div>
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Anuani / Mahali</label>
                         <input type="text" value={cvData.address} onChange={e => setCvData({...cvData, address: e.target.value})} className="rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600" placeholder="Mfano: Dar es Salaam, Tanzania" />
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Kuhusu Wewe (Professional Summary)</label>
                         <Textarea value={cvData.summary} onChange={e => setCvData({...cvData, summary: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={3} placeholder="Eleza kwa ufupi uzoefu na ujuzi wako unaokufanya uwe bora kwenye nafasi hii..." />
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Elimu na Miradi (Education & Projects)</label>
                         <Textarea value={cvData.education} onChange={e => setCvData({...cvData, education: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={3} placeholder="Mfano: Chuo Kikuu cha Dar es Salaam - BSc Computer Science (2018-2021) \nSekondari ya Tambaza - (2016-2018)" />
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Uzoefu wa Kazi (Experience)</label>
                         <Textarea value={cvData.experience} onChange={e => setCvData({...cvData, experience: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={4} placeholder="Mfano: Kampuni X - IT Officer (2021-Sasa) \n Majukumu yako: ..." />
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Ujuzi (Skills) - Tenganisha kwa mkato (,)</label>
                           <Textarea value={cvData.skills} onChange={e => setCvData({...cvData, skills: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={2} placeholder="Mfano: Digital Marketing, SEO, Content Creation, Data Analysis" />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm text-gray-300">Lugha (Languages) - Tenganisha kwa mkato (,)</label>
                           <Textarea value={cvData.languages} onChange={e => setCvData({...cvData, languages: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={2} placeholder="Mfano: Kiswahili, English, French" />
                         </div>
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Vyeti (Certificates) - Hiari, tenganisha kwa mkato (,)</label>
                         <Textarea value={cvData.certificates} onChange={e => setCvData({...cvData, certificates: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={2} placeholder="Mfano: Google Digital Garage, CPA (T)" />
                       </div>
                       <div className="flex flex-col gap-2">
                         <label className="text-sm text-gray-300">Wadhamini (Referees) - Tenganisha kwa mstari mpya (Enter)</label>
                         <Textarea value={cvData.referees} onChange={e => setCvData({...cvData, referees: e.target.value})} className="bg-gray-800 border-gray-600 text-white" rows={3} placeholder="Mfano: \nJohn Doe - CEO Kampuni X (0700000000) \nJane Smith - HR Manager (0600000000)" />
                       </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 w-full">
                      <button type="button" onClick={() => setApplicationStep(1)} className="rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white">Back</button>
                      <button type="button" onClick={() => {
                          const theme = CV_TEMPLATES.find(t => t.id === selectedTemplate) || CV_TEMPLATES[0];
                          setCvText(generateCVTemplate(cvData, theme.id, theme.color, linkedInUrl));
                          setApplicationStep(3);
                      }} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">Preview CV</button>
                    </div>
                  </>
                )}

                {applicationStep === 3 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 3: Preview ya CV Yako</h3>
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                      {CV_TEMPLATES.map(t => (
                         <button 
                           key={t.id} 
                           type="button"
                           onClick={() => {
                             setSelectedTemplate(t.id);
                             setCvText(generateCVTemplate(cvData, t.id, t.color, linkedInUrl));
                           }}
                           className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-all border-2 ${selectedTemplate === t.id ? 'border-white text-white' : 'border-transparent text-gray-400 bg-gray-800'}`}
                           style={{ backgroundColor: selectedTemplate === t.id ? t.color : '' }}
                         >
                           {t.name}
                         </button>
                      ))}
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-inner min-h-[40vh] max-h-[50vh] overflow-y-auto border border-gray-300">
                       <div dangerouslySetInnerHTML={{ __html: cvText }} />
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                      <button type="button" onClick={() => setApplicationStep(2)} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white">Edit CV (Rekebisha)</button>
                      <button type="button" onClick={() => setApplicationStep(4)} className="w-full sm:w-auto rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white">Nimeipenda, Endelea</button>
                    </div>
                  </>
                )}

                {applicationStep === 4 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 4: Viambatanisho (Attachments)</h3>
                    <p className="text-sm text-gray-400 mb-4">Pakia vyeti vya shule, vyuo, au nyaraka nyingine muhimu (Mwisho faili 10).</p>
                    
                    <div className="flex flex-col gap-4">
                       <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => {
                           if(e.target.files) {
                             const newFiles = Array.from(e.target.files);
                             if(attachmentFiles.length + newFiles.length > 10) {
                               toast.error('Huwezi kuweka faili zaidi ya 10 kwa wakati mmoja.');
                               return;
                             }
                             setAttachmentFiles(prev => [...prev, ...newFiles]);
                           }
                         }} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-600 focus:border-blue-500" />
                       
                       {attachmentFiles.length > 0 && (
                         <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 max-h-40 overflow-y-auto">
                           <h4 className="text-sm font-bold text-gray-300 mb-2">Faili ulizoweka ({attachmentFiles.length}):</h4>
                           <ul className="flex flex-col gap-2">
                             {attachmentFiles.map((file, idx) => (
                               <li key={idx} className="flex items-center justify-between text-sm text-gray-300 bg-gray-900 p-2 rounded">
                                 <span className="truncate max-w-[80%]"><FileText size={14} className="inline mr-2 text-blue-400"/>{file.name}</span>
                                 <button type="button" onClick={() => setAttachmentFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X size={16}/></button>
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}
                    </div>
                    
                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                      <button type="button" onClick={() => setApplicationStep(isBuildingCV ? 3 : 1)} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white">Back</button>
                      <button type="button" onClick={() => setApplicationStep(5)} className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">Next (Cover Letter)</button>
                    </div>
                  </>
                )}

                {applicationStep === 5 && (
                  <>
                    {/* Nimeigawa Layout hii kuwezesha Live Preview ya Cover Letter kwa Kompyuta (Screen Kubwa) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                      
                      {/* Sehemu ya Kushoto: Fomu ya Kujaza Barua */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-semibold text-gray-200">Hatua ya 5: Cover Letter</h3>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setCoverLetterLanguage('sw'); if(applyingJob) setCoverLetter(generateSwahiliTemplate(applyingJob)); }} className={`rounded px-3 py-1 text-xs font-semibold text-white transition-colors ${coverLetterLanguage === 'sw' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Swahili</button>
                            <button type="button" onClick={() => { setCoverLetterLanguage('en'); if(applyingJob) setCoverLetter(generateEnglishTemplate(applyingJob)); }} className={`rounded px-3 py-1 text-xs font-semibold text-white transition-colors ${coverLetterLanguage === 'en' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>English</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-300">Nchi (Country) <span className="text-red-500">*</span></label>
                          <select value={appCountry} onChange={(e) => { setAppCountry(e.target.value); setAppRegion(''); }} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none">
                            {Object.keys(COUNTRY_DIAL_CODES).map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-300">Mkoa / Jimbo (Region/State) <span className="text-red-500">*</span></label>
                          {LOCATION_DATA[appCountry] ? (
                            <select value={appRegion} onChange={(e) => { setAppRegion(e.target.value); setStep5Errors(prev => ({...prev, region: ''})); }} className={`w-full rounded-lg bg-gray-800 px-4 py-3 text-white border ${step5Errors.region ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'} focus:outline-none`}>
                              <option value="" disabled>Chagua Mkoa</option>
                              {LOCATION_DATA[appCountry].map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          ) : (
                            <input type="text" value={appRegion} onChange={(e) => { setAppRegion(e.target.value); setStep5Errors(prev => ({...prev, region: ''})); }} placeholder="Andika mkoa wako" className={`w-full rounded-lg bg-gray-800 px-4 py-3 text-white border ${step5Errors.region ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'} focus:outline-none`} />
                          )}
                          {step5Errors.region && <span className="text-red-500 text-xs font-bold">{step5Errors.region}</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-300">Sanduku la Posta <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                            <div className={`w-24 rounded-lg bg-gray-800 px-3 py-3 text-white border ${step5Errors.poBox ? 'border-red-500' : 'border-gray-700'} flex items-center justify-center font-bold`}>
                              {coverLetterLanguage === 'sw' ? 'S.L.P' : 'P.O.Box'}
                            </div>
                            <input type="text" placeholder="Namba (Mfano: 1234)" value={poBoxNumber} onChange={(e) => { setPoBoxNumber(e.target.value); setStep5Errors(prev => ({...prev, poBox: ''})); }} className={`w-full rounded-lg bg-gray-800 px-4 py-3 text-white border ${step5Errors.poBox ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'} focus:outline-none`} required />
                          </div>
                          {step5Errors.poBox && <span className="text-red-500 text-xs font-bold">{step5Errors.poBox}</span>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-300">Namba ya Simu (Phone Number) <span className="text-red-500">*</span></label>
                          <div className="flex gap-2">
                             <div className={`w-32 rounded-lg bg-gray-800 px-3 py-3 text-white border ${step5Errors.phone ? 'border-red-500' : 'border-gray-700'} flex items-center justify-center font-bold whitespace-nowrap overflow-hidden`}>
                                {COUNTRY_DIAL_CODES[appCountry] || '🏳️ +000'}
                             </div>
                             <input type="tel" placeholder="Mfano: 700000000" value={applicantPhone} onChange={(e) => { setApplicantPhone(e.target.value); setStep5Errors(prev => ({...prev, phone: ''})); }} className={`w-full rounded-lg bg-gray-800 px-4 py-3 text-white border ${step5Errors.phone ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'} focus:outline-none`} required />
                          </div>
                          {step5Errors.phone && <span className="text-red-500 text-xs font-bold">{step5Errors.phone}</span>}
                        </div>
                        <div className="flex flex-col gap-2 mb-8">
                          <label className="text-sm font-medium text-gray-300">Barua ya Maombi (Body) <span className="text-red-500">*</span></label>
                          <div className={`bg-white text-black rounded-lg overflow-hidden border ${step5Errors.body ? 'border-red-500' : 'border-gray-300'}`}>
                            <ReactQuill theme="snow" value={coverLetter} onChange={(val) => { setCoverLetter(val); setStep5Errors(prev => ({...prev, body: ''})); }} className="h-48 mb-12" placeholder="Write your cover letter here..." />
                          </div>
                          {step5Errors.body && <span className="text-red-500 text-xs font-bold mt-[-25px] ml-2 z-10 relative">{step5Errors.body}</span>}
                        </div>
                      </div>

                      {/* Sehemu ya Kulia: Live Preview */}
                      <div className="hidden lg:flex flex-col bg-gray-100 text-black p-8 rounded-lg shadow-inner border border-gray-400 overflow-y-auto" style={{ height: 'fit-content', minHeight: '600px' }}>
                        <h3 className="text-center font-bold mb-4 text-gray-600 uppercase tracking-widest text-sm border-b pb-2">Live Preview</h3>
                        <div className="font-serif text-sm w-full">
                           <div className="flex flex-col mb-6 w-full">
                              {/* Mtumaji (Juu Kulia) */}
                              <div className="text-right w-full mb-8">
                                <h1 className="font-bold text-lg uppercase">{user?.fullName || "Mwombaji"}</h1>
                                {poBoxNumber || appRegion ? (
                                  <>
                                    {poBoxNumber && <p>{coverLetterLanguage === 'sw' ? 'S.L.P' : 'P.O.Box'} {poBoxNumber},</p>}
                                    {appRegion && <p>{appRegion},</p>}
                                    <p>{appCountry}.</p>
                                  </>
                                ) : (
                                  <p>[Anuani Yako]</p>
                                )}
                                <p>{applicantPhone ? `${COUNTRY_DIAL_CODES[appCountry]?.split(' ')[1] || ''} ${applicantPhone}` : '[Simu Yako]'}</p>
                                <p>{applicantEmail}</p>
                                <p className="mt-2">{new Date().toLocaleDateString(coverLetterLanguage === 'sw' ? 'sw-TZ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              </div>
                              {/* Mpokeaji (Chini Kushoto) */}
                              <div className="text-left w-full">
                                <p>{coverLetterLanguage === 'sw' ? 'Meneja Rasilimali Watu,' : 'Human Resources Manager,'}</p>
                                <p className="font-bold">{applyingJob?.companyName},</p>
                                <p>{applyingJob?.companyAddress || 'Tanzania.'}</p>
                              </div>
                           </div>
                           {/* Body */}
                           <div className="text-justify ql-editor px-0 py-0" dangerouslySetInnerHTML={{ __html: coverLetter || '<p class="text-gray-400 italic">Barua yako itatokea hapa...</p>' }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                      <button type="button" onClick={() => setApplicationStep(4)} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition-colors">Back</button>
                      <div className="flex flex-col items-end w-full sm:w-auto">
                        <button type="button" onClick={handleStep5Next} className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors">Next</button>
                      </div>
                    </div>
                  </>
                )}
                {applicationStep === 6 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 6: E-Signature (Saini yako)</h3>
                    <div className="flex flex-col gap-2 mb-4">
                      <label className="text-sm font-medium text-gray-300 flex justify-between items-center">
                        <span>E-Signature (Saini Hapa) <span className="text-gray-500">- Hiari</span></span>
                        {hasSignature && (
                          <button type="button" onClick={clearSignature} className="text-xs text-red-400 hover:text-red-300 font-bold">Futa (Clear)</button>
                        )}
                      </label>
                      <canvas 
                        ref={canvasRef}
                        width={500}
                        height={120}
                        className="w-full bg-white rounded-lg border border-gray-300 cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      <p className="text-[10px] text-gray-400">Tumia kidole chako (kwa simu) au mouse (kwa kompyuta) kusaini kwenye kisanduku cheupe hapo juu.</p>
                    </div>
                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                      <button type="button" onClick={() => setApplicationStep(5)} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition-colors">Back</button>
                      <button type="button" onClick={() => {
                        if (canvasRef.current && hasSignature) {
                          setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
                        }
                        setApplicationStep(7);
                      }} className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors">Preview Cover Letter</button>
                    </div>
                  </>
                )}
                {applicationStep === 7 && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-200">Hatua ya 7: Preview & Submit</h3>
                    
                    <div className="bg-white text-black p-6 sm:p-10 rounded-lg text-sm font-serif max-h-[50vh] overflow-y-auto mt-2 shadow-inner border border-gray-300">
                      <div className="flex flex-col mb-10 relative z-10 w-full">
                        {/* Mtumaji Kulia */}
                        <div className="text-right w-full mb-10">
                             <h1 className="font-bold text-lg uppercase">{user?.fullName || "Mwombaji"}</h1>
                             {poBoxNumber || appRegion ? (
                               <>
                                 {poBoxNumber && <p>{coverLetterLanguage === 'sw' ? 'S.L.P' : 'P.O.Box'} {poBoxNumber},</p>}
                                 {appRegion && <p>{appRegion},</p>}
                                 <p>{appCountry}.</p>
                               </>
                             ) : (
                               applicantAddress ? applicantAddress.split(',').map((part, i) => <p key={i}>{part.trim()}</p>) : <p>[Anuani Yako]</p>
                             )}
                             <p className="mt-1">{COUNTRY_DIAL_CODES[appCountry]?.split(' ')[1] || ''} {applicantPhone}</p>
                             <p className="mt-1">{applicantEmail}</p>
                             <p className="mt-2">{new Date().toLocaleDateString(coverLetterLanguage === 'sw' ? 'sw-TZ' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        {/* Mpokeaji Kushoto */}
                        <div className="text-left w-full">
                           <p>{coverLetterLanguage === 'sw' ? 'Meneja Rasilimali Watu,' : 'Human Resources Manager,'}</p>
                           <p className="font-bold">{applyingJob?.companyName},</p>
                           {applyingJob?.companyAddress ? (
                             applyingJob.companyAddress
                               .replace(/(P\.?O\.?\s*Box|S\.?L\.?P\.?|Sanduku\s+la\s+posta)\s*,\s*/gi, '$1 ')
                               .split(/,|\n/)
                               .map((line, i) => {
                                 const trimmed = line.trim();
                                 return trimmed ? <p key={i}>{trimmed}</p> : null;
                               })
                           ) : (
                             <p>Tanzania.</p>
                           )}
                        </div>
                      </div>
                      
                      <div className="text-justify mb-10 text-base break-words ql-editor px-0 py-0" dangerouslySetInnerHTML={{ __html: coverLetter }} />
                      
                      <div className="flex flex-col items-center justify-center text-center mt-12">
                         <p className="mb-4 text-lg">Wako Mtiifu, / Sincerely,</p>
                         <div className="border-b border-black pb-1 mb-2 px-8 inline-block min-w-[200px]">
                           {signatureDataUrl ? (
                             <img src={signatureDataUrl} alt="Signature" className="h-20 object-contain mx-auto" />
                           ) : (
                             <div className="h-20"></div>
                           )}
                         </div>
                         <p className="font-bold text-lg">{user?.fullName || "Mwombaji"}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3 w-full">
                      <button type="button" onClick={() => setApplicationStep(6)} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition-colors">Back / Edit</button>
                      <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                        <button type="button" onClick={closeApplicationModal} disabled={isUploadingCV} className="w-full sm:w-auto rounded-lg bg-gray-700 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition-colors disabled:opacity-50">Cancel</button>
                        <button type="button" onClick={handleApplicationSubmit} disabled={isUploadingCV} className="w-full sm:w-auto rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                          {isUploadingCV ? 'Submitting...' : <><Send size={18}/> Submit Application</>}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (activeView === 'post_job_form') {
    return (
      <PostJobForm 
        editingJob={editingJob}
        setEditingJob={setEditingJob}
        setActiveView={setActiveView}
      />
    );
  }

  if (activeView === 'business_posted_jobs') {
    const handleDeleteJob = async (jobId: string) => {
      if (window.confirm('Are you sure you want to delete this job post? This action cannot be undone.')) {
        try {
          await deleteDoc(doc(db, 'posted_jobs', jobId));
          toast.success('Job deleted successfully!');
        } catch (error) {
          console.error("Error deleting job: ", error);
          toast.error('Failed to delete job. Please try again.');
        }
      }
    };

    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button onClick={() => setActiveView('business_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">My Posted Jobs</h1>
          </div>
          <button onClick={() => { setEditingJob(null); setActiveView('post_job_form'); }} className="w-full md:w-auto rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 transition-colors shadow-lg">
            + Post New Job
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {myJobs.length === 0 ? (
            <p className="text-gray-400">No jobs posted yet. Click &quot;+ Post New Job&quot; to create one.</p>
          ) : (
            myJobs.map((job) => {
              const applicantCount = myApplications.filter(app => app.jobId === job.id).length;
              return (
                <div key={job.id} className="rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-lg transition-all hover:border-blue-500">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                      {/* Left side: Info */}
                      <div className="flex flex-1 items-start gap-4">
                          {job.logoUrl ? (
                              <img src={job.logoUrl} alt="logo" className="w-16 h-16 rounded-lg object-cover border border-gray-600 bg-gray-800" />
                          ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                                  <Briefcase size={32} className="text-gray-400"/>
                              </div>
                          )}
                          <div className="flex-1">
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {job.jobPosition}
                                {new Date(job.deadline) < new Date() && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-widest">Expired</span>}
                              </h3>
                              <p className="text-sm text-blue-400 font-medium">{job.companyName} &bull; <span className="text-yellow-400">{job.jobType}</span></p>
                              <p className="text-xs text-red-400 mt-2">
                                  <span className="font-semibold">Deadline:</span> {new Date(job.deadline).toLocaleString()}
                              </p>
                          </div>
                      </div>

                      {/* Right side: Actions & Stats */}
                      <div className="flex w-full sm:w-auto flex-row sm:flex-col items-stretch sm:items-end gap-4">
                          <div className="flex flex-grow sm:flex-grow-0 sm:flex-col gap-2 w-full">
                              <button 
                                  onClick={() => { setEditingJob(job); setActiveView('post_job_form'); }}
                                  className="flex-1 sm:w-full px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 font-semibold text-white transition-colors text-center"
                              >
                                  Edit
                              </button>
                              <button 
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="flex-1 sm:w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors text-center"
                              >
                                  Delete
                              </button>
                          </div>
                          <div className="mt-2 text-center sm:text-right">
                              <p className="text-sm font-semibold text-gray-300">Applicants</p>
                              <p className="text-3xl font-bold text-green-400">{applicantCount}</p>
                          </div>
                      </div>
                  </div>
              </div>
              )
            })
          )}
        </div>
      </section>
    );
  }

  if (activeView === 'business_requests') {
    const pendingApplications = myApplications.filter(app => !app.interviewScheduled);
    return (
      <>
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('business_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Job Applications (Requests)</h1>
        </div>

        {/* Mpya: Chuja maombi ili kuonyesha yale tu ya kazi zilizopostiwa na mtumiaji wa sasa */}
        {/* Hii inategemea 'jobs' array ambayo tayari imechujwa na 'createdBy' */}
        {/* Na 'applications' array ambayo ina 'jobId' */}
        {pendingApplications.length === 0 ? ( 
            <p className="text-gray-400">No pending applications received for your job posts yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingApplications.map((app) => (
                <div key={app.id} onClick={() => handleMarkAsRead(app.id)} className="flex flex-col gap-4 rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-lg hover:border-gray-500 transition-all cursor-pointer">
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {!app.isRead && !justRead.has(app.id) && (
                          <span className="flex h-3 w-3 relative" title="New Application">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-white">Applied for: {app.jobPosition}</h3>
                      </div>
                      <p className="text-sm text-blue-400 font-medium">{app.companyName}</p>
                      <div className="mt-4 text-sm text-gray-300">
                        <span className="font-semibold text-gray-200">Cover Letter:</span>
                        <div className="mt-1 line-clamp-4 text-gray-300 ql-editor px-0 py-0" dangerouslySetInnerHTML={{ __html: app.coverLetter }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Applied At: {new Date(app.appliedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Sehemu ya vitufe imepangwa kwa mstari na flex-wrap */}
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-600">
                    {/* Kitufe cha Kuangalia CV */}
                    {app.cvUrl && (
                      <a
                        href={app.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <FileText size={16} /> View CV
                      </a>
                    )}
                      {/* Kitufe cha Kuangalia CV Iliyoandaliwa Kwenye Mfumo */}
                      {app.cvText && (
                        <button
                          onClick={() => setViewingCvApp(app)}
                          className="flex-1 px-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                        >
                          <FileText size={16} /> Soma CV
                        </button>
                      )}
                    {/* Mpya: Kitufe cha Kuangalia LinkedIn */}
                    {app.linkedInUrl && (
                      <a
                        href={app.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <Users size={16} /> LinkedIn
                      </a>
                    )}
                    {/* Mpya: Kitufe cha kudownload Cover Letter PDF */}
                    <button
                      onClick={() => handleDownloadMultiPagePDF(`cover-letter-${app.id}`, `Cover_Letter_${app.applicantName?.replace(/\s+/g, '_') || 'Mwombaji'}.pdf`, true)}
                      disabled={isDownloading === `cover-letter-${app.id}`}
                      className="flex-1 px-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mx-auto"
                    >
                      <FileText size={16} /> {isDownloading === `cover-letter-${app.id}` ? 'PDF...' : 'Cover Letter'}
                    </button>
                    {/* Mpya: Kitufe cha Kuratibu Interview */}
                    <button
                        onClick={() => {
                          setSchedulingForApplication(app);
                          setIsSchedulingInterview(true);
                          setCallDetails(undefined); // Futa maelezo ya mkutano uliopita
                          // Pre-fill date/time for convenience, e.g., tomorrow at 10 AM
                          const now = new Date();
                          const tomorrow = new Date(now);
                          tomorrow.setDate(now.getDate() + 1);
                          tomorrow.setHours(10, 0, 0, 0);
                          setInterviewValues({
                            ...interviewValues,
                            dateTime: tomorrow,
                            description: `Interview for ${app.jobPosition}`,
                            participants: '',
                          });
                        }}
                        className="flex-1 px-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <Calendar size={16} /> Schedule
                      </button>
                    {/* Mpya: Kitufe cha Kufuta Maombi (kwa sasa, kwa testing) */}
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this application?')) {
                          try {
                            await deleteDoc(doc(db, 'job_applications', app.id));
                            toast.success('Application deleted successfully!');
                          } catch (error) {
                            console.error("Error deleting application: ", error);
                            toast.error('Failed to delete application. Please try again.');
                          }
                        }
                      }}
                      className="flex-1 px-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                    >
                      <X size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Modal ya Kusoma CV iliyoandaliwa */}
        {viewingCvApp && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
              <button onClick={() => setViewingCvApp(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X size={24} /></button>
              <h2 className="mb-6 text-2xl font-bold text-white">CV: {viewingCvApp.applicantName}</h2>
              
              {/* Wrapper for PDF extraction */}
              <div id={`cv-document-${viewingCvApp.id}`} className="bg-white text-black p-0 sm:p-8 rounded-lg min-h-[297mm] w-full max-w-[210mm] mx-auto" style={{ boxSizing: 'border-box' }}>
                  <div dangerouslySetInnerHTML={{ __html: viewingCvApp.cvText! }} />
                  
                  {/* Attachments Section Inside CV for Printing */}
                  {viewingCvApp.attachments && viewingCvApp.attachments.length > 0 && (
                      <div className="mt-10 pt-10 px-8 border-t-2 border-gray-300" style={{ pageBreakBefore: 'always' }}>
                          <h3 className="text-xl font-bold mb-6 text-gray-800 uppercase tracking-widest">Viambatanisho (Attachments)</h3>
                          <div className="flex flex-col gap-8">
                             {viewingCvApp.attachments.map((att, idx) => {
                                 const isImage = att.url.match(/\.(jpeg|jpg|gif|png)(\?|$)/i) || att.name.match(/\.(jpeg|jpg|gif|png)$/i);
                                 return (
                                     <div key={idx} className="mb-4">
                                         <p className="font-semibold text-blue-600 underline mb-2">{att.name}</p>
                                         {isImage ? (
                                             <img src={att.url} alt={att.name} className="max-w-full h-auto border border-gray-200" crossOrigin="anonymous" />
                                         ) : (
                                             <p className="text-gray-600 text-sm">Pakua faili hili kwenye mfumo (PDF/DOC).</p>
                                         )}
                                     </div>
                                 );
                             })}
                          </div>
                      </div>
                  )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                 <button 
                    onClick={() => handleDownloadMultiPagePDF(`cv-document-${viewingCvApp.id}`, `CV_${viewingCvApp.applicantName?.replace(/\s+/g, '_')}_ImageBased.pdf`)}
                    disabled={isDownloading === `cv-document-${viewingCvApp.id}`}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    <FileText size={18} /> {isDownloading === `cv-document-${viewingCvApp.id}` ? 'Inashusha...' : 'Download (Image PDF)'}
                 </button>
                 <button 
                    onClick={() => {
                      handlePrintCV(viewingCvApp.cvText!, viewingCvApp.applicantName || 'Mwombaji', viewingCvApp.attachments);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                    <FileText size={18} /> Download High Quality PDF (Selectable Text)
                 </button>
              </div>
            </div>
          </div>
        )}

      </section>
      {/* Hidden Templates for Cover Letter PDFs (Aggressive style overrides) */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', zIndex: -100, opacity: 0, pointerEvents: 'none', boxShadow: 'none', textShadow: 'none', backgroundColor: 'transparent', borderColor: 'transparent' }}>
         {pendingApplications.map(app => {
            const job = jobs.find(j => j.id === app.jobId);
            return (
              <div 
                id={`cover-letter-${app.id}`} 
                key={`pdf-${app.id}`}
                className="relative"
               style={{ fontFamily: "'Times New Roman', Times, serif", width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#ffffff', color: '#000000', lineHeight: 1.6, padding: '50px 60px', boxSizing: 'border-box', fontSize: '14px' }}
              >
                 {/* Watermark Logo */}
                 {job?.logoUrl && (
                  <div className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none opacity-[0.05] z-0" style={{ width: '100%', height: '100%' }}>
                    <img src={job.logoUrl} alt="Watermark" style={{ width: '600px', height: '600px', objectFit: 'contain', filter: 'grayscale(100%)' }} crossOrigin="anonymous" />
                   </div>
                 )}

                 <div className="relative z-10">
                   {app.applicantAddress ? (
                     <>
                      {/* Header Mpya: Tenganisha anuani, Mpokeaji (Kushoto) na Mtumaji (Kulia) */}
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px', width: '100%' }}>
                         {/* Mtumaji (Kulia) */}
                         <div style={{ width: '100%', textAlign: 'right', marginBottom: '40px' }}>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '18px', textTransform: 'uppercase', fontWeight: 'bold' }}>{app.applicantName || "Mwombaji"}</h1>
                            {app.applicantAddress ? app.applicantAddress.split(',').map((part, idx) => (
                              <p key={idx} style={{ margin: 0 }}>{part.trim()}</p>
                            )) : null}
                            {app.applicantPhone && <p style={{ margin: 0, marginTop: '4px' }}>{app.applicantPhone}</p>}
                            {app.applicantEmail && <p style={{ margin: 0, marginTop: '4px' }}>{app.applicantEmail}</p>}
                            <p style={{ marginTop: '10px' }}>{new Date(app.appliedAt).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                         </div>
                         
                         {/* Mpokeaji (Kushoto) */}
                         <div style={{ width: '100%', textAlign: 'left' }}>
                            <p>Meneja Rasilimali Watu,</p>
                            <p style={{ fontWeight: 'bold' }}>{app.companyName},</p>
                            {job?.companyAddress ? (
                              job.companyAddress
                                .replace(/(P\.?O\.?\s*Box|S\.?L\.?P\.?|Sanduku\s+la\s+posta)\s*,\s*/gi, '$1 ')
                                .split(/,|\n/)
                                .map((line, i) => {
                                  const trimmed = line.trim();
                                  return trimmed ? <p key={i} style={{ margin: 0 }}>{trimmed}</p> : null;
                                })
                            ) : (
                              <p style={{ margin: 0 }}>Tanzania.</p>
                            )}
                         </div>
                       </div>

                       {/* Body Rendering via HTML */}
                       <div className="text-justify mb-10 ql-editor px-0 py-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: app.coverLetter }} />

                       {/* Sign-off, Signature, and Name */}
                       <div className="mt-12 flex flex-col items-center justify-center text-center">
                          <p style={{ marginBottom: '16px' }}>Wako Mtiifu, / Sincerely,</p>
                          <div className="border-b pb-1 mb-2 px-8 inline-block min-w-[200px]" style={{ borderColor: '#000000' }}>
                            {app.signatureUrl ? (
                               <img src={app.signatureUrl} alt="Signature" className="h-20 object-contain mx-auto" crossOrigin="anonymous" />
                            ) : (
                               <div className="h-20"></div>
                            )}
                          </div>
                          <p style={{ fontWeight: 'bold', marginTop: '8px' }}>{app.applicantName || "Mwombaji"}</p>
                       </div>

                       {/* Viambatanisho / Buttons (Tazama CV & LinkedIn) */}
                       {(app.cvUrl || app.linkedInUrl || (app.attachments && app.attachments.length > 0)) && (
                         <div className="mt-12 pt-6 border-t" style={{ borderColor: '#d1d5db', pageBreakInside: 'avoid' }}>
                            <p className="font-bold mb-4" style={{ color: '#1f2937' }}>Viambatanisho vya Mwombaji (Attachments):</p>
                            <div className="flex flex-col gap-8">
                              {app.cvUrl && (
                                 <div className="flex items-center gap-4">
                                   <div className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
                                      <FileText size={18} /> Tazama CV
                                   </div>
                                   <p className="text-sm underline truncate max-w-md" style={{ color: '#2563eb' }}>{app.cvUrl}</p>
                                 </div>
                              )}
                              {app.linkedInUrl && (
                                 <div className="flex items-center gap-4">
                                   <div className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0" style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                                      <Users size={18} /> LinkedIn Profile
                                   </div>
                                   <p className="text-sm underline truncate max-w-md" style={{ color: '#2563eb' }}>{app.linkedInUrl}</p>
                                 </div>
                              )}
                              {app.attachments && app.attachments.map((att, idx) => {
                                   const isImage = att.url.match(/\.(jpeg|jpg|gif|png)(\?|$)/i) || att.name.match(/\.(jpeg|jpg|gif|png)$/i);
                                   return (
                                       <div key={idx} className="mb-4">
                                           <p className="font-semibold underline mb-2" style={{ color: '#2563eb' }}>{att.name}</p>
                                           {isImage && (
                                               <img src={att.url} alt={att.name} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #e5e7eb' }} crossOrigin="anonymous" />
                                           )}
                                       </div>
                                   );
                               })}
                            </div>
                         </div>
                       )}
                     </>
                   ) : (
                     // Fallback for old applications
                     <>
                       <div className="text-justify mb-10 ql-editor px-0 py-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: app.coverLetter }} />
                       {/* Sign-off, Signature, and Name */}
                       <div className="mt-12 flex flex-col items-center justify-center text-center">
                          <p style={{ marginBottom: '16px' }}>Wako Mtiifu, / Sincerely,</p>
                          <div className="border-b pb-1 mb-2 px-8 inline-block min-w-[200px]" style={{ borderColor: '#000000' }}>
                            {app.signatureUrl ? (
                               <img src={app.signatureUrl} alt="Signature" className="h-20 object-contain mx-auto" crossOrigin="anonymous" />
                            ) : (
                               <div className="h-20"></div>
                            )}
                          </div>
                          <p style={{ fontWeight: 'bold', marginTop: '8px' }}>{app.applicantName || "Mwombaji"}</p>
                       </div>
                     </>
                   )}
                 </div>
              </div>
            );
         })}
      </div>

      {!callDetails ? (
        <MeetingModal
          isOpen={isSchedulingInterview}
          onClose={() => setIsSchedulingInterview(false)}
          title={`Schedule Interview for ${schedulingForApplication?.jobPosition}`}
          buttonText={isScheduling ? 'Scheduling...' : 'Schedule Interview'}
          handleClick={handleScheduleInterview}
          disabled={isScheduling}
        >
          <div className="flex flex-col gap-4">
            <div className='flex flex-col gap-2.5'>
              <label className='text-base text-normal leading-[22px] text-gray-300'>Interview Description</label>
              <Textarea
                className='border-none bg-gray-800 text-white focus-visible:ring-0 focus-visible:ring-offset-0'
                value={interviewValues.description}
                onChange={(e) => setInterviewValues({ ...interviewValues, description: e.target.value })}
              />
            </div>
            <div className='flex w-full flex-col gap-2.5'>
              <label className='text-base text-normal leading-[22px] text-gray-300'>Select Date and Time</label>
              <ReactDatePicker
                selected={interviewValues.dateTime}
                onChange={(date) => setInterviewValues({ ...interviewValues, dateTime: date! })}
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={15}
                timeCaption='time'
                dateFormat='MMMM d, yyyy h:mm aa'
                className='w-full rounded bg-gray-800 text-white py-2 px-3 focus:outline-none border border-gray-700'
              />
            </div>
            <div className='flex w-full flex-col gap-2.5'>
              <label className='text-base text-normal leading-[22px] text-gray-300'>Interview Duration (minutes)</label>
              <input
                  type="number"
                  value={interviewValues.duration}
                  onChange={(e) => setInterviewValues({ ...interviewValues, duration: parseInt(e.target.value, 10) || 0 })}
                  className='w-full rounded bg-gray-800 text-white py-2 px-3 focus:outline-none border border-gray-700'
                  min="30"
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-medium text-gray-300">Additional Participants (Judges&apos; Emails)</label>
              <Textarea
                value={interviewValues.participants} 
                onChange={(e) => setInterviewValues({ ...interviewValues, participants: e.target.value })}
                placeholder="Enter emails, separated by commas. For informational purposes." 
                className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={isSchedulingInterview}
          onClose={() => {
            setIsSchedulingInterview(false);
            setCallDetails(undefined);
          }}
          title="Interview Scheduled!"
          className="text-center"
          image={'/icons/checked.svg'}
          buttonIcon="/icons/copy.svg"
          buttonText="Copy Interview Link"
          handleClick={() => {
            if(!callDetails) return;
            const meetingLink = `${window.location.origin}/meeting/${callDetails.id}`;
            navigator.clipboard.writeText(meetingLink);
            toast.success('Link Copied');
          }}
        />
      )}
      </>
    );
  }

  if (activeView === 'business_scheduled_interviews') {
    const scheduledApplications = myApplications.filter(app => app.interviewScheduled);
    
    return (
      <>
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('business_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Scheduled Interviews</h1>
        </div>

        {scheduledApplications.length === 0 ? ( 
            <p className="text-gray-400">No interviews scheduled yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scheduledApplications.map((app) => (
                <div key={app.id} onClick={() => handleMarkAsRead(app.id)} className="flex flex-col gap-4 rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-lg hover:border-purple-500 transition-all cursor-pointer">
                  <div className="flex flex-col gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {!app.isRead && !justRead.has(app.id) && (
                          <span className="flex h-3 w-3 relative" title="New Scheduled Interview">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-white">Candidate for: {app.jobPosition}</h3>
                      </div>
                      <p className="text-sm text-blue-400 font-medium">Applicant: {app.applicantName || 'N/A'}</p>
                      {app.applicantEmail && <p className="text-xs text-gray-400">{app.applicantEmail}</p>}
                      {app.applicantPhone && <p className="text-xs text-gray-400">{app.applicantPhone}</p>}
                    </div>
                    
                    {app.interviewDate && (
                      <div className="flex-1 p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                        <p className="text-sm font-semibold text-gray-200">Interview Details:</p>
                        <p className="text-xs text-gray-300">Date: {new Date(app.interviewDate).toLocaleString()}</p>
                        <p className="text-xs text-gray-300">Link: <a href={app.interviewLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{app.interviewLink}</a></p>
                        {app.interviewerName && <p className="text-xs text-gray-300">By: {app.interviewerName}</p>}
                        
                        <div className={`mt-2 text-xs font-bold p-1 rounded text-center ${app.interviewPaid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            Payment Status: {app.interviewPaid ? 'Paid' : 'Payment Required (TZS 5,000)'}
                        </div>

                        {app.rescheduleRequested && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelingApplication(app);
                              setCancelReason('');
                              setWillReschedule(true);
                              setRescheduleDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
                              setIsCancelingInterview(true);
                            }}
                            className="mt-2 w-full p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-left transition-colors group"
                          >
                            <p className="text-xs font-bold text-red-400 group-hover:text-red-300">ONYO: Muombaji ameripoti hujatokea kwenye kikao (No-Show)!</p>
                            <p className="text-[11px] text-gray-300 mt-1">Bonyeza hapa kuweka sababu na kupanga siku mpya, au utatozwa faini ya TZS 10,000.</p>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-600">
                    {app.cvUrl && (
                      <a
                        href={app.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <FileText size={16} /> View CV
                      </a>
                    )}
                      {app.cvText && (
                        <button
                          onClick={() => setViewingCvApp(app)}
                          className="flex-1 px-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                        >
                          <FileText size={16} /> Soma CV
                        </button>
                      )}
                    {app.linkedInUrl && (
                      <a
                        href={app.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <Users size={16} /> LinkedIn
                      </a>
                    )}
                    <button
                      onClick={() => handleDownloadMultiPagePDF(`cover-letter-${app.id}`, `Cover_Letter_${app.applicantName?.replace(/\s+/g, '_') || 'Mwombaji'}.pdf`, true)}
                      disabled={isDownloading === `cover-letter-${app.id}`}
                      className="flex-1 px-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mx-auto"
                    >
                      <FileText size={16} /> {isDownloading === `cover-letter-${app.id}` ? 'PDF...' : 'Cover Letter'}
                    </button>
                    {app.interviewLink && (
                      <a
                        href={app.interviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <Calendar size={16} /> Interview
                      </a>
                    )}
                    {app.isAccepted ? (
                      <div className="flex-1 px-1 py-2 rounded-lg bg-green-500/20 text-green-400 font-semibold text-sm text-center shadow-md flex items-center justify-center gap-2 mx-auto cursor-default">
                        <Check size={16} /> Amekubaliwa
                      </div>
                    ) : app.interviewDate && new Date() >= new Date(app.interviewDate) ? (
                      <>
                        <button
                          onClick={async () => {
                            if (window.confirm('Je, una uhakika unataka kumkubali (Accept) mwombaji huyu?')) {
                              try {
                                await updateDoc(doc(db, 'job_applications', app.id), { isAccepted: true });
                                toast.success('Mwombaji amekubaliwa kikamilifu!');
                                
                                if (app.applicantId) {
                                  addDoc(collection(db, 'notifications'), {
                                    userId: app.applicantId,
                                    title: 'Hongera! Umekubaliwa Kazi',
                                    message: `Ombi lako la kazi ya ${app.jobPosition} kwenye kampuni ya ${app.companyName} limekubaliwa. Kampuni itawasiliana nawe hivi karibuni kwa hatua zinazofuata.`,
                                    createdAt: new Date().toISOString(),
                                    isRead: false,
                                    type: 'accepted',
                                    link: '/personal-room?view=applicant_interviews'
                                  }).catch(console.error);
                                }

                                fetch('/api/accept-candidate', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    applicantName: app.applicantName,
                                    applicantEmail: app.applicantEmail,
                                    applicantPhone: app.applicantPhone,
                                    jobPosition: app.jobPosition,
                                    companyName: app.companyName
                                  })
                                }).catch(console.error);

                              } catch (error) {
                                console.error("Error accepting candidate: ", error);
                                toast.error('Imeshindwa kumkubali mwombaji.');
                              }
                            }
                          }}
                          className="flex-1 px-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                        >
                          <Check size={16} /> Kubali
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Je, una uhakika unataka kumkataa mwombaji huyu na kufuta ombi lake?')) {
                              try {
                                await deleteDoc(doc(db, 'job_applications', app.id));
                                toast.success('Mwombaji amekataliwa na ombi limefutwa!');
                              } catch (error) {
                                console.error("Error deleting application: ", error);
                                toast.error('Imeshindwa kumkataa. Tafadhali jaribu tena.');
                              }
                            }
                          }}
                          className="flex-1 px-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                        >
                          <X size={16} /> Kataa
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setCancelingApplication(app);
                          setCancelReason('');
                          setWillReschedule(false);
                          setRescheduleDateTime(new Date());
                          setIsCancelingInterview(true);
                        }}
                        className="flex-1 px-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 font-semibold text-white text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 mx-auto"
                      >
                        <X size={16} /> Sitisha Kikao
                      </button>
                    )}
                  </div>
                  
                  {/* Mpya: Kuonyesha Viambatanisho kama vipo */}
                  {app.attachments && app.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600 w-full">
                      <p className="font-bold mb-2 text-sm text-gray-300">Viambatanisho vya Ziada ({app.attachments.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {app.attachments.map((att, idx) => (
                           <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold text-blue-400 text-xs transition-colors flex items-center gap-1 border border-gray-700"><FileText size={14} /> {att.name}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        {/* Modal ya Kusoma CV iliyoandaliwa */}
        {viewingCvApp && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-800 p-8 shadow-2xl">
              <button onClick={() => setViewingCvApp(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X size={24} /></button>
              <h2 className="mb-6 text-2xl font-bold text-white">CV: {viewingCvApp.applicantName}</h2>
              
              {/* Wrapper for PDF extraction */}
              <div id={`cv-document-${viewingCvApp.id}`} className="bg-white text-black p-0 sm:p-8 rounded-lg min-h-[297mm] w-full max-w-[210mm] mx-auto" style={{ boxSizing: 'border-box' }}>
                  <div dangerouslySetInnerHTML={{ __html: viewingCvApp.cvText! }} />
                  
                  {/* Attachments Section Inside CV for Printing */}
                  {viewingCvApp.attachments && viewingCvApp.attachments.length > 0 && (
                      <div className="mt-10 pt-10 px-8 border-t-2 border-gray-300" style={{ pageBreakBefore: 'always' }}>
                          <h3 className="text-xl font-bold mb-6 text-gray-800 uppercase tracking-widest">Viambatanisho (Attachments)</h3>
                          <div className="flex flex-col gap-8">
                             {viewingCvApp.attachments.map((att, idx) => {
                                 const isImage = att.url.match(/\.(jpeg|jpg|gif|png)(\?|$)/i) || att.name.match(/\.(jpeg|jpg|gif|png)$/i);
                                 return (
                                     <div key={idx} className="mb-4">
                                         <p className="font-semibold text-blue-600 underline mb-2">{att.name}</p>
                                         {isImage ? (
                                             <img src={att.url} alt={att.name} className="max-w-full h-auto border border-gray-200" crossOrigin="anonymous" />
                                         ) : (
                                             <p className="text-gray-600 text-sm">Pakua faili hili kwenye mfumo (PDF/DOC).</p>
                                         )}
                                     </div>
                                 );
                             })}
                          </div>
                      </div>
                  )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                 <button 
                    onClick={() => handleDownloadMultiPagePDF(`cv-document-${viewingCvApp.id}`, `CV_${viewingCvApp.applicantName?.replace(/\s+/g, '_')}_ImageBased.pdf`)}
                    disabled={isDownloading === `cv-document-${viewingCvApp.id}`}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    <FileText size={18} /> {isDownloading === `cv-document-${viewingCvApp.id}` ? 'Inashusha...' : 'Download (Image PDF)'}
                 </button>
                 <button 
                    onClick={() => {
                      handlePrintCV(viewingCvApp.cvText!, viewingCvApp.applicantName || 'Mwombaji', viewingCvApp.attachments);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                 >
                    <FileText size={18} /> Download High Quality PDF (Selectable Text)
                 </button>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* Hidden Templates for Cover Letter PDFs (Aggressive style overrides) */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', zIndex: -100, opacity: 0, pointerEvents: 'none', boxShadow: 'none', textShadow: 'none', backgroundColor: 'transparent', borderColor: 'transparent' }}>
         {scheduledApplications.map(app => {
            const job = jobs.find(j => j.id === app.jobId);
            return (
              <div 
                id={`cover-letter-${app.id}`} 
                key={`pdf-${app.id}`}
                className="relative"
               style={{ fontFamily: "'Times New Roman', Times, serif", width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#ffffff', color: '#000000', lineHeight: 1.6, padding: '50px 60px', boxSizing: 'border-box', fontSize: '14px' }}
              >
                 {job?.logoUrl && (
                  <div className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none opacity-[0.05] z-0" style={{ width: '100%', height: '100%' }}>
                    <img src={job.logoUrl} alt="Watermark" style={{ width: '600px', height: '600px', objectFit: 'contain', filter: 'grayscale(100%)' }} crossOrigin="anonymous" />
                   </div>
                 )}

                 <div className="relative z-10">
                   {app.applicantAddress ? (
                     <>
                      {/* Header Mpya: Tenganisha anuani, Mpokeaji (Kushoto) na Mtumaji (Kulia) */}
                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px', width: '100%' }}>
                         {/* Mtumaji (Kulia) */}
                         <div style={{ width: '100%', textAlign: 'right', marginBottom: '40px' }}>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '18px', textTransform: 'uppercase', fontWeight: 'bold' }}>{app.applicantName || "Mwombaji"}</h1>
                            {app.applicantAddress ? app.applicantAddress.split(',').map((part, idx) => (
                              <p key={idx} style={{ margin: 0 }}>{part.trim()}</p>
                            )) : null}
                            {app.applicantPhone && <p style={{ margin: 0, marginTop: '4px' }}>{app.applicantPhone}</p>}
                            {app.applicantEmail && <p style={{ margin: 0, marginTop: '4px' }}>{app.applicantEmail}</p>}
                            <p style={{ marginTop: '10px' }}>{new Date(app.appliedAt).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                         </div>
                         
                         {/* Mpokeaji (Kushoto) */}
                         <div style={{ width: '100%', textAlign: 'left' }}>
                            <p>Meneja Rasilimali Watu,</p>
                            <p style={{ fontWeight: 'bold' }}>{app.companyName},</p>
                            {job?.companyAddress ? (
                              job.companyAddress
                                .replace(/(P\.?O\.?\s*Box|S\.?L\.?P\.?|Sanduku\s+la\s+posta)\s*,\s*/gi, '$1 ')
                                .split(/,|\n/)
                                .map((line, i) => {
                                  const trimmed = line.trim();
                                  return trimmed ? <p key={i} style={{ margin: 0 }}>{trimmed}</p> : null;
                                })
                            ) : (
                              <p style={{ margin: 0 }}>Tanzania.</p>
                            )}
                         </div>
                       </div>

                       <div className="text-justify mb-10 ql-editor px-0 py-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: app.coverLetter }} />

                       <div className="mt-12 flex flex-col items-center justify-center text-center">
                          <p style={{ marginBottom: '16px' }}>Wako Mtiifu, / Sincerely,</p>
                          <div className="border-b pb-1 mb-2 px-8 inline-block min-w-[200px]" style={{ borderColor: '#000000' }}>
                            {app.signatureUrl ? (
                               <img src={app.signatureUrl} alt="Signature" className="h-20 object-contain mx-auto" crossOrigin="anonymous" />
                            ) : (
                               <div className="h-20"></div>
                            )}
                          </div>
                          <p style={{ fontWeight: 'bold', marginTop: '8px' }}>{app.applicantName || "Mwombaji"}</p>
                       </div>

                       {(app.cvUrl || app.linkedInUrl || (app.attachments && app.attachments.length > 0)) && (
                         <div className="mt-12 pt-6 border-t" style={{ borderColor: '#d1d5db', pageBreakInside: 'avoid' }}>
                            <p className="font-bold mb-4" style={{ color: '#1f2937' }}>Viambatanisho vya Mwombaji (Attachments):</p>
                            <div className="flex flex-col gap-8">
                              {app.cvUrl && (
                                 <div className="flex items-center gap-4">
                                   <div className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
                                      <FileText size={18} /> Tazama CV
                                   </div>
                                   <p className="text-sm underline truncate max-w-md" style={{ color: '#2563eb' }}>{app.cvUrl}</p>
                                 </div>
                              )}
                              {app.linkedInUrl && (
                                 <div className="flex items-center gap-4">
                                   <div className="px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0" style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                                      <Users size={18} /> LinkedIn Profile
                                   </div>
                                   <p className="text-sm underline truncate max-w-md" style={{ color: '#2563eb' }}>{app.linkedInUrl}</p>
                                 </div>
                              )}
                              {app.attachments && app.attachments.map((att, idx) => {
                                   const isImage = att.url.match(/\.(jpeg|jpg|gif|png)(\?|$)/i) || att.name.match(/\.(jpeg|jpg|gif|png)$/i);
                                   return (
                                       <div key={idx} className="mb-4">
                                           <p className="font-semibold underline mb-2" style={{ color: '#2563eb' }}>{att.name}</p>
                                           {isImage && (
                                               <img src={att.url} alt={att.name} style={{ maxWidth: '100%', height: 'auto', border: '1px solid #e5e7eb' }} crossOrigin="anonymous" />
                                           )}
                                       </div>
                                   );
                               })}
                            </div>
                         </div>
                       )}
                     </>
                   ) : (
                     <>
                       <div className="text-justify mb-10 ql-editor px-0 py-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: app.coverLetter }} />
                       <div className="mt-12 flex flex-col items-center justify-center text-center">
                          <p style={{ marginBottom: '16px' }}>Wako Mtiifu, / Sincerely,</p>
                          <div className="border-b pb-1 mb-2 px-8 inline-block min-w-[200px]" style={{ borderColor: '#000000' }}>
                            {app.signatureUrl ? (
                               <img src={app.signatureUrl} alt="Signature" className="h-20 object-contain mx-auto" crossOrigin="anonymous" />
                            ) : (
                               <div className="h-20"></div>
                            )}
                          </div>
                          <p style={{ fontWeight: 'bold', marginTop: '8px' }}>{app.applicantName || "Mwombaji"}</p>
                       </div>
                     </>
                   )}
                 </div>
              </div>
            );
         })}
      </div>

      {/* Mpya: Cancel Interview Modal */}
      {isCancelingInterview && cancelingApplication && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md overflow-y-auto rounded-2xl border border-gray-700 bg-dark-1 p-6 shadow-2xl scrollbar-hide">
            <button onClick={() => setIsCancelingInterview(false)} className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="mb-2 text-2xl font-bold text-white">Cancel / Reschedule Interview</h2>
            <p className="mb-6 text-sm text-gray-300">Candidate: <span className="font-semibold text-white">{cancelingApplication.applicantName}</span></p>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Reason for Cancellation / No-Show <span className="text-red-500">*</span></label>
                <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Tafadhali eleza sababu za msingi..." className="bg-gray-800 border-gray-700 text-white" rows={4} />
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="reschedule" checked={willReschedule} onChange={(e) => setWillReschedule(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                <label htmlFor="reschedule" className="text-sm text-gray-300 cursor-pointer">I want to reschedule this interview to a new date</label>
              </div>
              
              {willReschedule && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">New Date and Time</label>
                  <ReactDatePicker
                    selected={rescheduleDateTime}
                    onChange={(date) => setRescheduleDateTime(date!)}
                    showTimeSelect
                    timeFormat='HH:mm'
                    timeIntervals={15}
                    dateFormat='MMMM d, yyyy h:mm aa'
                    className='w-full rounded bg-gray-800 text-white py-2 px-3 focus:outline-none border border-gray-700'
                  />
                </div>
              )}

              {!willReschedule && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs mt-2">
                  <strong>Onyo:</strong> Ukicancel bila kuweka siku nyingine ya kikao (reschedule) na bila sababu za msingi, utatozwa faini ya <strong>TZS 10,000</strong>. Hii itatozwa kwenye akaunti yako.
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setIsCancelingInterview(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-semibold">Back</button>
                <button onClick={handleConfirmCancel} disabled={!cancelReason.trim() || isProcessingCancel} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-semibold disabled:opacity-50">
                  {isProcessingCancel ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  if (activeView === 'business_dashboard') {
    // Use memoized values for statistics to improve performance
    const myJobsCount = myJobs.length;
    const myApplicationsCount = myApplications.length;
    const scheduledInterviewsCount = myApplications.filter(app => app.interviewScheduled).length;
    const unpaidPenaltiesCount = myApplications.filter(app => (app.penaltyApplied || app.interviewerPenaltyPending) && !app.penaltyPaid).length;
    const totalPenaltyAmount = unpaidPenaltiesCount * 10000; // Inahesabu ambazo hazijalipwa tu kwenye kadi

    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button onClick={() => setActiveView('plans')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
            &larr; Back to Plans
          </button>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Business Conferencing Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-2">
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-blue-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('admin_users')}
          >
            <UserCog className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Team Management</h3>
            <p className="mt-2 text-sm font-medium text-gray-400 text-center">Manage staff & meetings</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-yellow-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('business_posted_jobs')}
          >
            <Briefcase className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Jobs Posted</h3>
            <p className="mt-2 text-4xl font-extrabold text-yellow-400">{myJobsCount}</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-green-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('business_requests')}
          >
            <FileText className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Request</h3>
            <p className="mt-2 text-4xl font-extrabold text-green-400">{myApplicationsCount}</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-purple-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('business_scheduled_interviews')}
          >
            <Calendar className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Scheduled Interview</h3>
            <p className="mt-2 text-4xl font-extrabold text-purple-400">{scheduledInterviewsCount}</p>
          </div>
          <div 
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-10 shadow-lg hover:border-red-500 transition-all cursor-pointer text-center"
            onClick={() => setActiveView('business_penalties')}
          >
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-200">Penalties</h3>
            <p className="mt-2 text-3xl font-extrabold text-red-400">TZS {totalPenaltyAmount.toLocaleString()}</p>
          </div>
        </div>
      </section>
    );
  }

  if (activeView === 'business_penalties') {
    const penaltyApps = myApplications.filter(app => app.penaltyApplied || app.interviewerPenaltyPending);
    
    const handlePayPenalty = async (appId: string) => {
       try {
          const app = myApplications.find(a => a.id === appId);
          const job = jobs.find(j => j.id === app?.jobId);

          // Hapa utaweka muunganiko wa malipo halisi (Payment Gateway)
          await updateDoc(doc(db, 'job_applications', appId), { penaltyPaid: true });
          toast.success("Faini imelipwa kikamilifu!");

          // Tuma Notification ya mfumo
          if (user?.id) {
            addDoc(collection(db, 'notifications'), {
              userId: user.id,
              title: 'Malipo ya Faini Yamefanikiwa',
              message: `Umefanikiwa kulipia faini ya TZS 10,000 kwa usaili wa kazi ya ${app?.jobPosition || 'hiyo'}. Risiti imetumwa kwenye barua pepe yako.`,
              createdAt: new Date().toISOString(),
              isRead: false,
              type: 'payment_success',
              link: '/personal-room?view=business_penalties'
            }).catch(console.error);
          }

          // Tuma Risiti (SMS, Email Mteja, Email UYAO)
          try {
            const res = await fetch('/api/send-receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user?.primaryEmailAddress?.emailAddress,
                name: user?.fullName || 'Muajiri',
                phone: job?.contactPhone || '', 
                amount: 10000,
                currency: 'TZS',
                description: `Malipo ya Faini (Kusitisha Usaili) - ${app?.jobPosition || ''}`,
                receiptNumber: `FNI-${Math.floor(Math.random() * 1000000)}`,
                date: new Date().toISOString()
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Imeshindwa kutuma risiti');
          } catch (error: any) {
            console.error(error);
            toast.error(`Risiti Imefeli: ${error.message}`);
          }
       } catch(e) {
          console.error(e);
          toast.error("Malipo yameshindwa.");
       }
    };

    const getPenaltyDeadline = (dateString?: string) => {
       const startDate = new Date(dateString || Date.now());
       let addedDays = 0;
       const current = new Date(startDate);
       while(addedDays < 7) {
         current.setDate(current.getDate() + 1);
         // Ruka Jumapili (0) na Jumamosi (6). Ili kuruka sikukuu, utahitaji API ya holidays
         if (current.getDay() !== 0 && current.getDay() !== 6) addedDays++;
       }
       return current;
    };

    return (
       <section className="flex size-full flex-col gap-10 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button onClick={() => setActiveView('business_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors text-sm sm:text-base shrink-0">
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">Penalties Details</h1>
          </div>
          <div className="flex flex-col gap-6">
            {penaltyApps.length === 0 ? (
              <p className="text-gray-400 text-lg">Hongera! Huna faini yoyote kwa sasa.</p>
            ) : (
              penaltyApps.map(app => {
                const deadline = getPenaltyDeadline(app.penaltyAppliedAt || app.appliedAt);
                const timeLeft = deadline.getTime() - currentTime.getTime();
                const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const isExpired = timeLeft <= 0;

                return (
                <div key={app.id} className={`p-6 rounded-2xl border ${app.penaltyPaid ? 'border-green-500/50 bg-green-500/10' : (app.penaltyApplied ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10')} shadow-lg flex flex-col justify-between gap-4`}>
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Candidate: {app.applicantName || 'N/A'}</h3>
                    <p className="text-sm text-gray-300 mb-1"><span className="font-semibold text-white">Position:</span> {app.jobPosition}</p>
                    <p className="text-sm text-gray-300 mb-1">
                      <span className="font-semibold text-white">Status:</span> 
                      {app.penaltyPaid ? (
                        <span className="text-green-400 ml-1 font-bold">LIPWA (PAID)</span>
                      ) : app.penaltyApplied ? (
                        <span className="text-red-400 ml-1">Penalty Applied (Kusitisha kikao bila kupanga siku nyingine)</span>
                      ) : <span className="text-yellow-400 ml-1">Pending Penalty (No-Show Warning)</span>}
                    </p>
                    <div className="mt-3 bg-gray-900/80 p-4 rounded-xl border border-gray-700/50">
                      <span className="font-semibold text-white block mb-2">Reason Logged:</span>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{app.cancelReason || app.rescheduleReason || 'N/A'}</p>
                    </div>
                  </div>
                    <div className="flex flex-col items-start md:items-end justify-start shrink-0">
                       <p className="text-sm text-red-400 font-bold uppercase tracking-wider mb-1">Kiasi cha Faini</p>
                       <p className={`text-3xl font-black ${app.penaltyPaid ? 'text-green-500 line-through opacity-70' : 'text-red-500'}`}>TZS 10,000</p>
                    </div>
                  </div>
                  
                  {/* Sehemu ya Timer na Malipo */}
                  {!app.penaltyPaid && app.penaltyApplied && (
                    <div className="mt-2 bg-gray-900/50 p-4 rounded-xl border border-red-500/30">
                      {isExpired ? (
                         <p className="text-red-400 font-bold text-sm">⚠️ Muda wa malipo umeisha. Mfumo unakata faini moja kwa moja kutoka kwenye akaunti yako ya benki iliyounganishwa...</p>
                      ) : (
                         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                           <div>
                             <p className="text-sm text-yellow-400">Muda uliobaki wa kulipa faini (Siku 7 za Kazi):</p>
                             <p className="text-2xl font-black text-white">{daysLeft} Siku, {hoursLeft} Masaa</p>
                           </div>
                           <button onClick={() => handlePayPenalty(app.id)} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg w-full md:w-auto transition-colors">
                              Lipa Faini (TZS 10,000)
                           </button>
                         </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
       </section>
    );
  }

  if (activeView === 'admin_users') {
    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % MANAGEMENT_SLIDES.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + MANAGEMENT_SLIDES.length) % MANAGEMENT_SLIDES.length);

    return (
           <section className="flex flex-col h-[calc(100vh-140px)] w-full gap-4 text-white overflow-y-auto overflow-x-hidden pb-6 scrollbar-hide">
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => setActiveView('business_dashboard')} className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600 transition-colors">
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Team Management</h1>
          </div>
          
          {/* Slideshow Section */}
          <div className="relative w-full flex-1 min-h-[120px] rounded-2xl overflow-hidden shadow-xl group">
            <img 
              src={MANAGEMENT_SLIDES[currentSlide].image} 
              alt="Management Slide" 
              className="w-full h-full object-cover transition-transform duration-700 transform group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent flex flex-col justify-center px-6 md:px-10">
              <h2 className="text-2xl md:text-4xl font-black text-white mb-2 max-w-xl leading-tight drop-shadow-lg">{MANAGEMENT_SLIDES[currentSlide].title}</h2>
              <p className="text-sm md:text-lg text-gray-200 max-w-lg drop-shadow-md line-clamp-2">{MANAGEMENT_SLIDES[currentSlide].desc}</p>
            </div>
            {/* Controls */}
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full hover:bg-black/80 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-3 rounded-full hover:bg-black/80 text-white transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100">
              <ChevronRight size={24} />
            </button>
            {/* Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {MANAGEMENT_SLIDES.map((_, idx) => (
                <div key={idx} onClick={() => setCurrentSlide(idx)} className={`w-3 h-3 rounded-full cursor-pointer transition-all ${currentSlide === idx ? 'bg-blue-500 scale-125' : 'bg-white/50 hover:bg-white/80'}`} />
              ))}
            </div>
          </div>

          {/* Ujumbe wa Kukaribisha (Welcome Message) */}
          <div className="bg-gray-800/60 border border-gray-700 p-3 sm:p-4 rounded-xl text-center shadow-inner shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Karibu, {user?.fullName || 'Meneja'}! 👋</h2>
            <p className="text-gray-300 text-xs sm:text-sm">Hiki ni kitovu chako kikuu cha kusimamia wafanyakazi, kupanga vikao, na kushughulikia masuala ya kinidhamu. Chagua hatua hapa chini kuanza.</p>
          </div>

          {/* Quick Action Cards (Chini ya Slideshow) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 pb-8">
            {/* Kadi 1: My Employees (Bluu) */}
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 sm:p-4 rounded-xl flex flex-col items-center text-center gap-2 hover:border-blue-500 hover:bg-blue-900/30 transition-all shadow-md">
              <div className="p-2 bg-blue-500/20 rounded-full text-blue-400 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 leading-tight">My Employees</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 leading-tight hidden sm:block">Orodha na taarifa za wafanyakazi wako wote.</p>
              </div>
              <button onClick={() => setActiveView('employee_directory')} className="mt-auto w-full py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors">
                View List
              </button>
            </div>

            {/* Kadi 2: Schedule Staff Meeting (Kijani) */}
            <div className="bg-green-900/20 border border-green-500/30 p-3 sm:p-4 rounded-xl flex flex-col items-center text-center gap-2 hover:border-green-500 hover:bg-green-900/30 transition-all shadow-md">
              <div className="p-2 bg-green-500/20 rounded-full text-green-400 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 leading-tight">Staff Meeting</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 leading-tight hidden sm:block">Panga kikao cha mtandaoni na wafanyakazi.</p>
              </div>
              <button onClick={() => setActiveView('schedule_staff_meeting')} className="mt-auto w-full py-1.5 sm:py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-bold transition-colors">
                Schedule Meeting
              </button>
            </div>

            {/* Kadi 3: Disciplinary Hearings (Chungwa) */}
            <div className="bg-orange-900/20 border border-orange-500/30 p-3 sm:p-4 rounded-xl flex flex-col items-center text-center gap-2 hover:border-orange-500 hover:bg-orange-900/30 transition-all shadow-md">
              <div className="p-2 bg-orange-500/20 rounded-full text-orange-400 flex items-center justify-center">
                <Gavel size={20} />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 leading-tight">Disciplinary Hearings</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 leading-tight hidden sm:block">Endesha vikao vya kinidhamu kwa usalama.</p>
              </div>
              <button onClick={() => setActiveView('admin_disciplinary_cases')} className="mt-auto w-full py-1.5 sm:py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold transition-colors">
                Start Hearing
              </button>
            </div>

            {/* Kadi 4: Employment Terminations (Nyekundu) */}
            <div className="bg-red-900/20 border border-red-500/30 p-3 sm:p-4 rounded-xl flex flex-col items-center text-center gap-2 hover:border-red-500 hover:bg-red-900/30 transition-all shadow-md">
              <div className="p-2 bg-red-500/20 rounded-full text-red-400 flex items-center justify-center">
                <DoorOpen size={20} />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-sm sm:text-base font-bold text-white mb-0.5 leading-tight">Terminations</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 leading-tight hidden sm:block">Simamia usitishaji wa ajira kwa utaratibu.</p>
              </div>
              <button onClick={() => { toast.info("Tafadhali chagua mfanyakazi wa kumsitisha kutoka kwenye orodha."); setActiveView('employee_directory'); }} className="mt-auto w-full py-1.5 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors">
                Manage Terminations
              </button>
            </div>
          </div>
       </section>
    );
  }

  if (activeView === 'employee_directory') {
    const filteredEmps = myEmployees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchEmpQuery.toLowerCase()) || emp.empId.toLowerCase().includes(searchEmpQuery.toLowerCase());
      const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
      const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedEmps(new Set(filteredEmps.map(emp => emp.id)));
      } else {
        setSelectedEmps(new Set());
      }
    };

    const handleSelectEmp = (id: string) => {
      const newSet = new Set(selectedEmps);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedEmps(newSet);
    };

    return (
      <section className="flex size-full flex-col gap-6 text-white pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('admin_users')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors">
              &larr; Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
              Employee Directory
              <span className="text-sm font-medium bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">Total: {myEmployees.length}</span>
            </h1>
          </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0 w-full md:w-auto">
          <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm shadow-lg">
            Export Excel
          </button>
          <button onClick={handleExportDirectoryPDF} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm shadow-lg">
            Export PDF
          </button>
          {selectedEmps.size > 0 && (
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-sm shadow-lg">
              Action for ({selectedEmps.size}) Selected
            </button>
          )}
        </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 w-full bg-gray-800/40 p-4 rounded-xl border border-gray-700 shadow-inner">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Name or ID..." 
              value={searchEmpQuery}
              onChange={(e) => setSearchEmpQuery(e.target.value)}
              className="w-full rounded-lg bg-gray-900 py-2.5 pl-10 pr-4 text-white text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full sm:w-auto rounded-lg bg-gray-900 py-2.5 pl-9 pr-4 text-white text-sm border border-gray-700 focus:border-blue-500 focus:outline-none appearance-none"
              >
                <option value="All">All Departments</option>
                <option value="Human Resources">Human Resources</option>
                <option value="IT">IT</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg bg-gray-900 py-2.5 px-4 text-white text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>

        {/* The List Structure */}
        <div className="w-full overflow-x-auto bg-[#1a1f2e] rounded-xl border border-gray-700 shadow-xl">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_minmax(250px,2fr)_140px_minmax(180px,1.5fr)_120px_100px] gap-4 p-5 border-b border-gray-700 text-sm font-bold text-gray-400 uppercase tracking-wider min-w-[900px] bg-gray-800/50">
            <div className="flex items-center justify-center">
              <input type="checkbox" onChange={handleSelectAll} checked={selectedEmps.size === filteredEmps.length && filteredEmps.length > 0} className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer" />
            </div>
            <div>Profile</div>
            <div>Emp ID</div>
            <div>Role / Dept</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col min-w-[900px]">
            {filteredEmps.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No employees found.</div>
            ) : (
              filteredEmps.map(emp => (
                <div key={emp.id} className="grid grid-cols-[40px_minmax(250px,2fr)_140px_minmax(180px,1.5fr)_120px_100px] gap-4 p-5 border-b border-gray-800/80 items-center hover:bg-gray-800/40 transition-colors group">
                  
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={selectedEmps.has(emp.id)} onChange={() => handleSelectEmp(emp.id)} className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer" />
                  </div>
                  
                  {/* Profile */}
                  <div className="flex items-center gap-4">
                    <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full border border-gray-600 object-cover" />
                    <div className="flex flex-col">
                      <span className="font-bold text-white uppercase text-base leading-tight group-hover:text-blue-400 transition-colors">{emp.name}</span>
                      <span className="text-sm text-gray-400 mt-1">{emp.email}</span>
                    </div>
                  </div>

                  {/* Employee ID */}
                  <div className="text-base font-medium text-gray-300">
                    {emp.empId}
                  </div>

                  {/* Role/Department */}
                  <div className="flex flex-col">
                    <span className="text-base text-gray-200 font-medium">{emp.role}</span>
                    <span className="text-sm text-gray-500 mt-1">{emp.department}</span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      emp.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      emp.status === 'On Leave' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 relative">
                    <button className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="View Profile">
                      <Eye size={18} />
                    </button>
              <button onClick={() => { setEditingEmployee(emp); setEditEmpData({ role: emp.role, department: emp.department, status: emp.status }); }} className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Edit">
                      <Edit size={18} />
              </button>
              <button onClick={() => handleDeleteEmployee(emp.appId)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                <Trash size={18} />
                    </button>
                    <button onClick={() => setActiveDropdown(activeDropdown === emp.id ? null : emp.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="More Actions">
                      <MoreVertical size={18} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeDropdown === emp.id && (
                      <div className="absolute right-8 top-10 w-56 bg-[#1f2937] border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="flex flex-col">
                          <button onClick={() => { setActiveDropdown(null); handleInitiateDisciplinary(emp); }} className="px-4 py-3 text-xs text-left text-gray-200 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2">
                            <Gavel size={14} className="text-orange-400" /> Initiate Disciplinary Hearing
                          </button>
                          <button onClick={() => setActiveDropdown(null)} className="px-4 py-3 text-xs text-left text-gray-200 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2">
                            <Calendar size={14} className="text-blue-400" /> Schedule Performance Review
                          </button>
                          <div className="border-t border-gray-600 my-1"></div>
                  <button onClick={() => { setActiveDropdown(null); setTerminatingEmployee(emp); setActiveView('terminations_dashboard'); }} className="px-4 py-3 text-xs text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                            <DoorOpen size={14} /> Process Termination
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal ya Ku-Edit Employee */}
        {editingEmployee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
              <button onClick={() => setEditingEmployee(null)} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X size={24} /></button>
              <h2 className="mb-4 text-xl font-bold text-white">Edit Employee Info</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300">Jina</label>
                  <input type="text" value={editingEmployee.name} disabled className="w-full rounded-lg bg-gray-900 px-4 py-3 text-gray-500 border border-gray-700 cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300">Cheo (Role)</label>
                  <input type="text" value={editEmpData.role} onChange={e => setEditEmpData({...editEmpData, role: e.target.value})} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300">Idara (Department)</label>
                  <select value={editEmpData.department} onChange={e => setEditEmpData({...editEmpData, department: e.target.value})} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 outline-none">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="IT">IT</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-300">Hali (Status)</label>
                  <select value={editEmpData.status} onChange={e => setEditEmpData({...editEmpData, status: e.target.value})} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 outline-none">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
                <div className="mt-4 flex gap-3 w-full">
                  <button onClick={() => setEditingEmployee(null)} className="w-full rounded-lg bg-gray-700 px-4 py-3 font-bold text-white hover:bg-gray-600 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveEmployee} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (activeView === 'schedule_staff_meeting') {
    return (
      <section className="flex size-full flex-col gap-6 text-white pb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-700 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveView('admin_users')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors">
              &larr; Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
              Schedule Staff Meeting
            </h1>
          </div>
          <button className="px-5 py-2.5 bg-blue-900/50 hover:bg-blue-900 text-blue-300 font-bold rounded-lg transition-colors text-sm border border-blue-700/50 flex items-center gap-2 shadow-lg">
            <Calendar size={16} /> My Meetings History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kushoto: Calendar View */}
          <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col gap-4">
             <h2 className="text-lg font-bold text-blue-400 border-b border-gray-700 pb-2 flex items-center gap-2">
                <Calendar size={18}/> Calendar View
             </h2>
             <p className="text-xs text-gray-400">Chagua tarehe hapa chini. Vikao vingine vitaonekana kuzuia muingiliano.</p>
             <div className="bg-gray-900/50 p-4 rounded-xl flex justify-center custom-datepicker-container border border-gray-800">
               <ReactDatePicker 
                 inline
                 selected={staffMeetingDate}
                 onChange={(date) => setStaffMeetingDate(date!)}
               />
             </div>
          </div>

          {/* Kati: Meeting Details Form */}
          <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col gap-5">
             <h2 className="text-lg font-bold text-green-400 border-b border-gray-700 pb-2 flex items-center gap-2">
                <FileText size={18}/> Meeting Details
             </h2>
             <div className="flex flex-col gap-2">
               <label className="text-sm font-medium text-gray-300">Meeting Title <span className="text-red-500">*</span></label>
               <input type="text" value={staffMeetingTitle} onChange={(e) => setStaffMeetingTitle(e.target.value)} placeholder="e.g. Weekly Team Sync" className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" />
             </div>
             <div className="flex flex-col gap-2">
               <label className="text-sm font-medium text-gray-300">Time <span className="text-red-500">*</span></label>
               <ReactDatePicker
                  selected={staffMeetingDate}
                  onChange={(date) => setStaffMeetingDate(date!)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
               />
             </div>
             <div className="flex flex-col gap-2">
               <label className="text-sm font-medium text-gray-300">Duration <span className="text-red-500">*</span></label>
               <select value={staffMeetingDuration} onChange={(e) => setStaffMeetingDuration(Number(e.target.value))} className="w-full rounded-lg bg-gray-900 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none">
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={90}>1 Hour 30 Minutes</option>
                  <option value={120}>2 Hours</option>
               </select>
             </div>
             <div className="flex flex-col gap-2">
               <label className="text-sm font-medium text-gray-300">Meeting Link (Auto-generated)</label>
               <div className="w-full rounded-lg bg-gray-900/50 px-4 py-3 text-gray-400 border border-gray-700 font-mono text-xs overflow-hidden text-ellipsis select-all">
                 {typeof window !== 'undefined' ? `${window.location.origin}/meeting/${previewMeetingId}` : `.../meeting/${previewMeetingId}`}
               </div>
             </div>
          </div>

          {/* Kulia: Add Employees */}
          <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-gray-700 pb-2">
               <h2 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                  <Users size={18}/> Add Employees
               </h2>
               <button 
                 onClick={() => {
                   if (staffMeetingAttendees.size === myEmployees.length) setStaffMeetingAttendees(new Set());
                   else setStaffMeetingAttendees(new Set(myEmployees.map(e => e.id)));
                 }}
                 className="text-xs font-bold bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
               >
                 {staffMeetingAttendees.size === myEmployees.length ? 'Deselect All' : 'Select All'}
               </button>
             </div>
             <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin pr-2 flex flex-col gap-2">
               {myEmployees.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Huna wafanyakazi kwenye mfumo kwa sasa.</p>
               ) : (
                  myEmployees.map(emp => (
                     <div key={emp.id} className="flex items-center gap-3 bg-gray-900/50 p-2.5 rounded-xl border border-gray-700/50 hover:border-blue-500/50 cursor-pointer transition-colors" onClick={() => {
                        const newSet = new Set(staffMeetingAttendees);
                        if (newSet.has(emp.id)) newSet.delete(emp.id);
                        else newSet.add(emp.id);
                        setStaffMeetingAttendees(newSet);
                     }}>
                        <input type="checkbox" checked={staffMeetingAttendees.has(emp.id)} readOnly className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer pointer-events-none" />
                        <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white leading-none">{emp.name}</span>
                           <span className="text-[10px] text-gray-400">{emp.role}</span>
                        </div>
                     </div>
                  ))
               )}
             </div>
             <button 
               onClick={handleScheduleStaffMeeting}
               disabled={isSchedulingStaffMeeting}
               className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
             >
               {isSchedulingStaffMeeting ? 'Inatuma Mialiko...' : <><Send size={18} /> Tuma Mialiko (Schedule)</>}
             </button>
          </div>
        </div>

        {/* CSS maalumu ya kubadili muonekano wa ReactDatePicker kuwa wa kisasa */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-datepicker-container .react-datepicker { background-color: transparent !important; border: none !important; font-family: inherit; width: 100%; }
          .custom-datepicker-container .react-datepicker__month-container { width: 100%; float: none; }
          .custom-datepicker-container .react-datepicker__header { background-color: transparent !important; border-bottom: 1px solid #374151 !important; }
          .custom-datepicker-container .react-datepicker__current-month, 
          .custom-datepicker-container .react-datepicker__day-name, 
          .custom-datepicker-container .react-datepicker__day { color: #e5e7eb !important; font-size: 1.1rem; width: 2.2rem; line-height: 2.2rem; }
          .custom-datepicker-container .react-datepicker__day:hover { background-color: #374151 !important; border-radius: 50%; }
          .custom-datepicker-container .react-datepicker__day--selected { background-color: #2563eb !important; color: #ffffff !important; border-radius: 50%; font-weight: bold; }
          .custom-datepicker-container .react-datepicker__day--keyboard-selected { background-color: #1e3a8a !important; border-radius: 50%; }
        `}} />
      </section>
    );
  }

  if (activeView === 'employee_dashboard') {
    const getGreeting = () => {
      const hour = currentTime.getHours();
      if (hour < 12) return 'Habari ya Asubuhi';
      if (hour < 16) return 'Habari ya Mchana';
      if (hour < 19) return 'Habari ya Jioni';
      return 'Habari ya Usiku';
    };

    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <div className="flex items-center gap-4">
            <img src={user?.imageUrl || `https://ui-avatars.com/api/?name=${user?.fullName || 'W'}&background=2563eb&color=fff`} alt="Profile" className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">{getGreeting()}, {user?.firstName || 'Mfanyakazi'}! 👋</h1>
              <p className="text-sm text-blue-400 font-medium">Cheo (Role): Mfanyakazi (Employee)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveView('job_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 transition-colors">
              &larr; Rudi Nyuma (Back)
            </button>
          </div>
        </div>

        {/* Attendance (Mahudhurio) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-6 rounded-2xl border border-blue-500/30 shadow-lg flex flex-col items-center justify-center text-center gap-4">
            <h2 className="text-lg font-bold text-gray-200">Muda wa Sasa (Current Time)</h2>
            <div className="text-4xl font-black text-blue-400 tracking-wider">
              {currentTime.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <p className="text-sm text-gray-400">{currentTime.toLocaleDateString('sw-TZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-sm">
              {!isClockedIn ? (
                <button 
                  onClick={() => {
                    setIsClockedIn(true);
                    setClockInTime(new Date());
                    toast.success('Umeingia kazini (Clocked In) kikamilifu!');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <LogIn size={18} /> Ingia (Clock In)
                </button>
              ) : (
                <div className="flex flex-col w-full gap-2">
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 text-sm text-green-400">
                    Uliingia kazini saa: <span className="font-bold">{clockInTime?.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsClockedIn(false);
                      setClockInTime(null);
                      toast.success('Umetoka kazini (Clocked Out) kikamilifu!');
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    <DoorOpen size={18} /> Toka (Clock Out)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-200 border-b border-gray-700 pb-2 flex items-center gap-2">
              <Bell size={18} className="text-yellow-400" /> Arifa Mpya (Notifications)
            </h2>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-2 scrollbar-thin">
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-200">Maombi yako ya likizo yamekubaliwa.</p>
                  <span className="text-[10px] text-gray-500">Leo, 08:30 Asubuhi</span>
                </div>
              </div>
              <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20 flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse"></div>
                <div>
                  <p className="text-sm text-red-200">Kumbusha: Una wito wa kikao cha nidhamu saa 8 mchana.</p>
                  <span className="text-[10px] text-red-400/70">Jana, 16:45 Jioni</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Icons */}
        <h2 className="text-xl font-bold text-white mt-4">Vifungo vya Haraka (Quick Access)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div onClick={() => setActiveView('leave_dashboard')} className="bg-emerald-900/20 border border-emerald-500/30 p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:bg-emerald-900/40 hover:border-emerald-500 transition-all cursor-pointer group shadow-md">
            <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-200 text-sm">Likizo (Leave)</h3>
              <p className="text-[10px] text-gray-400 mt-1">Omba / Salio</p>
            </div>
          </div>
          
          <div onClick={() => setActiveView('payslips_dashboard')} className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:bg-blue-900/40 hover:border-blue-500 transition-all cursor-pointer group shadow-md">
            <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
              <Receipt size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-200 text-sm">Mishahara (Payslips)</h3>
              <p className="text-[10px] text-gray-400 mt-1">Pakua payslip</p>
            </div>
          </div>

          <div onClick={() => setActiveView('disciplinary_hearing')} className="bg-orange-900/20 border border-orange-500/30 p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:bg-orange-900/40 hover:border-orange-500 transition-all cursor-pointer group shadow-md">
            <div className="p-3 bg-orange-500/20 rounded-full text-orange-400 group-hover:scale-110 transition-transform">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-200 text-sm">Nidhamu (Disciplinary)</h3>
              <p className="text-[10px] text-gray-400 mt-1">Rekodi / Wito</p>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-500/30 p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:bg-purple-900/40 hover:border-purple-500 transition-all cursor-pointer group shadow-md">
            <div className="p-3 bg-purple-500/20 rounded-full text-purple-400 group-hover:scale-110 transition-transform">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-200 text-sm">Mafunzo (Training)</h3>
              <p className="text-[10px] text-gray-400 mt-1">Kozi & Semina</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (activeView === 'disciplinary_hearing') {
    if (!myDisciplinaryCase) {
        return (
            <section className="flex size-full flex-col gap-8 text-white pb-10 items-center justify-center h-full">
                <div className="text-center bg-gray-800/40 p-10 rounded-2xl border border-gray-700">
                    <Gavel size={48} className="text-gray-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white">Hakuna Kesi ya Kinidhamu</h1>
                    <p className="text-gray-400 mt-2">Huna kesi yoyote ya kinidhamu inayoendelea kwa sasa.</p>
                    <button onClick={() => setActiveView('employee_dashboard')} className="mt-6 rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
                        &larr; Rudi Dashibodi
                    </button>
                </div>
            </section>
        );
    }

    const chargeSheetDocs = myDisciplinaryCase.documents?.filter(d => d.type === 'ChargeSheet') || [];
    const decisionDocs = myDisciplinaryCase.documents?.filter(d => d.type === 'Decision') || [];

    return (
      <section className="flex size-full flex-col gap-6 text-white pb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-full text-orange-400">
              <Gavel size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Dashibodi ya Nidhamu</h1>
              <p className="text-sm text-orange-400 font-medium">Jina: {user?.fullName || 'Mfanyakazi'}</p>
            </div>
          </div>
          <button onClick={() => setActiveView('employee_dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 transition-colors">
            &larr; Rudi Dashibodi
          </button>
        </div>

        {/* Grid Layout for Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            
            {/* 1. NOTICES (Barua Mpya) */}
            <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" /> NOTICES (Barua Mpya)
                </h2>
                {myDisciplinaryCase.step >= 2 && <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded shadow-sm">🔴 Inasubiri Kusomwa</span>}
              </div>
              <div className="flex flex-col gap-3">
                {chargeSheetDocs.length > 0 ? chargeSheetDocs.map((doc, idx) => (
                    <div key={idx} className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-semibold text-white">{doc.title}</p>
                            <p className="text-xs text-gray-400">{new Date(doc.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors flex items-center gap-1"><Eye size={14}/> [View]</button>
                            <button className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors flex items-center gap-1"><FileText size={14}/> [Download]</button>
                        </div>
                    </div>
                )) : (
                    <p className="text-xs text-gray-400 text-center italic py-2">Hakuna barua mpya kwa sasa. Uchunguzi unaendelea.</p>
                )}
              </div>
            </div>

            {/* 2. UTETEZI WAKO (Response Center) */}
            <div className={`bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4 relative overflow-hidden ${myDisciplinaryCase.step !== 3 ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <Edit size={18} className="text-yellow-400" /> UTETEZI WAKO (WSD)
                </h2>
                {myDisciplinaryCase.step === 3 && !myDisciplinaryCase.wsodUploaded && <span className="text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded shadow-sm">🟡 Inasubiri Majibu</span>}
                {myDisciplinaryCase.wsodUploaded && <span className="text-[10px] uppercase font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded shadow-sm">✅ Umewasilisha</span>}
              </div>
              <p className="text-xs text-gray-400">Andika utetezi wako (Written Statement of Defence) hapa chini au pakia faili (PDF/Doc).</p>
              <Textarea placeholder="[ Andika Utetezi Hapa... ]" className="bg-gray-900 border-gray-700 text-white min-h-[120px] focus:border-blue-500" disabled={myDisciplinaryCase.step !== 3 || myDisciplinaryCase.wsodUploaded} />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-400">[ Pakia Kiambatisho (PDF/Doc) ]</label>
                <input type="file" accept=".pdf,.doc,.docx" className="w-full rounded-lg bg-gray-900 px-4 py-2 text-white border border-gray-700 text-sm" disabled={myDisciplinaryCase.step !== 3 || myDisciplinaryCase.wsodUploaded} />
              </div>
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 mt-2 shadow-lg" disabled={myDisciplinaryCase.step !== 3 || myDisciplinaryCase.wsodUploaded}>
                <Send size={18} /> {myDisciplinaryCase.wsodUploaded ? 'UMESHAWASILISHA' : '[ TUMA KWA BOSS ]'}
              </button>
            </div>

          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">

            {/* 3. KIKAO CHA NIDHAMU (Virtual Hearing) */}
            <div className={`bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4 relative overflow-hidden ${myDisciplinaryCase.step !== 4 ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-400" /> KIKAO CHA NIDHAMU
                </h2>
                {myDisciplinaryCase.step === 4 && <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded shadow-sm">🔵 Kimepangwa</span>}
              </div>
              {myDisciplinaryCase.step === 4 ? (
                <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 text-center flex flex-col gap-2">
                  <p className="text-sm text-gray-300">Tarehe: <span className="font-bold text-white">10/04/2026</span> | Saa: <span className="font-bold text-white">04:00 Asubuhi</span></p>
                  <button className="mt-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                    <Calendar size={18} /> [ JIUNGE NA KIKAO (ONLINE) ]
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">Kitufe kitakuwa 'active' dakika 10 kabla ya kikao.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center italic py-4">Kikao hakijapangwa bado.</p>
              )}
            </div>

            {/* 4 & 5. MAAMUZI YA KIKAO & ARCHIVE */}
            <div className={`bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4 relative overflow-hidden flex-1 ${myDisciplinaryCase.step < 5 ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-500"></div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                  <Gavel size={18} className="text-gray-400" /> MAAMUZI YA KIKAO
                </h2>
                {myDisciplinaryCase.step >= 5 && <span className="text-[10px] uppercase font-bold bg-gray-500/20 text-gray-400 px-2 py-1 rounded shadow-sm">⚪ {myDisciplinaryCase.step > 5 ? 'Imefungwa' : 'Inasubiriwa'}</span>}
              </div>
              <p className="text-xs text-gray-400">Nyaraka za mwisho, maamuzi ya kamati na Mwenendo mzima utawekwa hapa baada ya kikao kukamilika (Archive).</p>
              <div className="flex flex-col gap-3 mt-2">
                {decisionDocs.length > 0 ? decisionDocs.map((doc, idx) => (
                    <div key={idx} className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-semibold text-white">{doc.title}</p>
                            <p className="text-xs text-gray-400">{new Date(doc.date).toLocaleDateString()}</p>
                        </div>
                        <button className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded-lg transition-colors flex items-center gap-1"><FileText size={14}/> [Download]</button>
                    </div>
                )) : (
                    <p className="text-xs text-gray-500 text-center italic py-2">Hakuna maamuzi yaliyotolewa bado.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    );
  }

  if (activeView === 'admin_disciplinary_cases') {
    const myCases = disciplinaryCases.filter(c => c.employerId === user?.id);

    const handleDeleteCase = async (e: React.MouseEvent, caseId: string) => {
      e.stopPropagation();
      if (window.confirm("Je, una uhakika unataka kufuta kesi hii ya kinidhamu?")) {
        try {
          await deleteDoc(doc(db, 'disciplinary_cases', caseId));
          toast.success("Kesi imefutwa kikamilifu.");
          if (activeCaseId === caseId) setActiveCaseId(null);
        } catch (err) {
          toast.error("Imeshindwa kufuta kesi.");
        }
      }
    };

    return (
       <section className="flex size-full flex-col gap-6 text-white pb-10">
         <div className="flex items-center justify-between bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl">
           <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('admin_users')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors">&larr; Back to Team</button>
             <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
               Disciplinary Hearings <span className="text-sm bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/30">{myCases.length} Cases</span>
             </h1>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
           {myCases.length === 0 ? (
             <p className="text-gray-400">Hakuna kesi zozote za kinidhamu zilizoanzishwa.</p>
           ) : (
             myCases.map(c => (
               <div key={c.id} onClick={() => { setActiveCaseId(c.id); setActiveView('admin_case_management'); }} className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg hover:border-orange-500 hover:bg-gray-800/80 transition-all cursor-pointer group flex flex-col gap-4">
                 <div className="flex justify-between items-start">
                   <span className="px-2 py-1 bg-gray-900 rounded text-xs font-mono text-gray-400 border border-gray-700">{c.caseNumber}</span>
                   <div className="flex items-center gap-2">
                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${c.step > 5 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                        {c.step > 5 ? 'Closed' : `Step ${c.step} of 5`}
                     </span>
                     <button onClick={(e) => handleDeleteCase(e, c.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors" title="Futa Kesi">
                       <Trash size={14} />
                     </button>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <img src={c.employeeAvatar} className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover" alt="Avatar"/>
                   <div className="flex flex-col">
                     <span className="font-bold text-white group-hover:text-orange-400 transition-colors">{c.employeeName}</span>
                     <span className="text-xs text-gray-400">{c.employeeDept}</span>
                   </div>
                 </div>
                 <div className="w-full bg-gray-900 rounded-full h-1.5 mt-2">
                   <div className={`h-1.5 rounded-full ${c.step > 5 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min((c.step / 5) * 100, 100)}%` }}></div>
                 </div>
                 <p className="text-[10px] text-gray-500 text-right mt-[-8px]">Last updated: {new Date(c.updatedAt).toLocaleDateString()}</p>
               </div>
             ))
           )}
         </div>
       </section>
    );
  }

  if (activeView === 'admin_case_management' && activeCaseId) {
    const activeCase = disciplinaryCases.find(c => c.id === activeCaseId);
    if (!activeCase) return null;

    const steps = [
      { num: 1, title: 'Investigation & Warnings' },
      { num: 2, title: 'Charge Sheet & Notice' },
      { num: 3, title: 'Statement of Defence' },
      { num: 4, title: 'Virtual Hearing' },
      { num: 5, title: 'Decision & Notification' },
    ];

    const updateCaseStep = async (newStep: number, updateData: any = {}, showToast: boolean = true) => {
      try {
        await updateDoc(doc(db, 'disciplinary_cases', activeCase.id), {
           step: newStep,
           updatedAt: new Date().toISOString(),
           ...updateData
        });
        if (showToast) {
          toast.success("Hatua imesonga mbele kikamilifu.");
        }
      } catch(e) {
        toast.error("Imeshindwa kusasisha.");
      }
    };

    const handleCompleteInvestigation = async () => {
      // 1. Sasisha hatua ya kesi kwenda 2
      await updateCaseStep(2, {}, false); // `false` inazuia toast ya kawaida

      // 2. Tuma taarifa (notification) kwa mfanyakazi
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: activeCase.employeeId,
          title: 'Uchunguzi wa Awali Umekamilika',
          message: `Uchunguzi wa awali kuhusu mwenendo wako umekamilika. Mwajiri wako anajiandaa na hatua inayofuata ya kukupatia hati ya mashtaka (Charge Sheet).`,
          createdAt: new Date().toISOString(),
          isRead: false,
          type: 'disciplinary_step1',
          link: '/personal-room?view=disciplinary_hearing'
        });
        toast.success("Hatua imesonga mbele na taarifa imetumwa kwa mfanyakazi.");
      } catch (error) {
        console.error("Failed to send notification:", error);
        toast.error("Hatua imesonga, lakini imeshindwa kutuma taarifa kwa mfanyakazi.");
      }
    };

    const handleSimulateUploadWSOD = async () => {
       try {
         const newDoc = { title: 'Written Statement of Defence', type: 'WSOD', date: new Date().toISOString(), url: '#' };
         await updateDoc(doc(db, 'disciplinary_cases', activeCase.id), {
            wsodUploaded: true,
            documents: [...(activeCase.documents || []), newDoc],
            updatedAt: new Date().toISOString()
         });
         toast.success("Utetezi umepokelewa (Simulated)");
       } catch(e) { toast.error("Error updating WSOD"); }
    };

    return (
       <section className="flex size-full flex-col gap-6 text-white pb-10">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl gap-4">
           <div className="flex items-center gap-4">
             <button onClick={() => setActiveView('admin_disciplinary_cases')} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors whitespace-nowrap">&larr; Back to Cases</button>
             <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-3">
               Case Management: <span className="text-orange-400">{activeCase.caseNumber}</span>
             </h1>
           </div>
         </div>

         {/* Timeline Tracker */}
         <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg relative overflow-x-auto">
            <div className="flex items-center justify-between relative z-10 min-w-[600px] px-4">
              <div className="absolute left-10 right-10 top-[20px] h-1 bg-gray-700 -z-10"></div>
              <div className="absolute left-10 top-[20px] h-1 bg-green-500 -z-10 transition-all" style={{ width: `calc(${(Math.min(activeCase.step - 1, 4) / 4) * 100}% - 40px)` }}></div>
              
              {steps.map(step => {
                 const isCompleted = activeCase.step > step.num;
                 const isCurrent = activeCase.step === step.num;
                 return (
                   <div key={step.num} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-800 ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-gray-600 text-gray-400'}`}>
                         {isCompleted ? <Check size={18} /> : <span className="font-bold text-sm">{step.num}</span>}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-bold text-center max-w-[80px] ${isCompleted ? 'text-green-400' : isCurrent ? 'text-yellow-400' : 'text-gray-500'}`}>{step.title}</span>
                   </div>
                 )
              })}
            </div>
         </div>

         {/* 3-Column Layout */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left: Employee Bio */}
            <div className="lg:col-span-1 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col items-center text-center gap-4 h-fit">
               <img src={activeCase.employeeAvatar} className="w-24 h-24 rounded-full border-4 border-gray-700 object-cover" alt="Profile" />
               <div>
                 <h3 className="text-lg font-bold text-white uppercase">{activeCase.employeeName}</h3>
                 <p className="text-sm text-gray-400">{activeCase.employeeRole}</p>
                 <p className="text-xs text-blue-400 font-bold mt-1 px-2 py-1 bg-blue-900/20 rounded-lg">{activeCase.employeeDept}</p>
               </div>
               <div className="w-full h-px bg-gray-700 my-2"></div>
               <div className="w-full text-left text-xs text-gray-400 flex flex-col gap-2">
                 <p><span className="text-gray-300 font-semibold">Case ID:</span> {activeCase.caseNumber}</p>
                 <p><span className="text-gray-300 font-semibold">Opened:</span> {new Date(activeCase.createdAt).toLocaleDateString()}</p>
                 <p><span className="text-gray-300 font-semibold">Last Update:</span> {new Date(activeCase.updatedAt).toLocaleDateString()}</p>
               </div>
            </div>

            {/* Center: Action Area */}
            <div className="lg:col-span-2 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-6">
               <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-3">Current Action Required</h2>
               
               {activeCase.step === 1 && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-300">Fanya uchunguzi wa awali na mpe mfanyakazi onyo (Kama inafaa) kabla ya kupandisha mashtaka.</p>
                    <button onClick={handleCompleteInvestigation} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg">
                      Mark Investigation Complete &rarr;
                    </button>
                  </div>
               )}

               {activeCase.step === 2 && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-300">Tengeneza na upakie Hati ya Mashitaka (Charge Sheet) na Wito (Notice of Hearing).</p>
                    <button onClick={() => {
                      updateCaseStep(3, { documents: [...(activeCase.documents || []), { title: 'Charge Sheet & Notice', type: 'ChargeSheet', date: new Date().toISOString(), url: '#' }] });
                    }} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-lg">
                      Tuma Hati ya Mashitaka (Charge Sheet) &rarr;
                    </button>
                  </div>
               )}

               {activeCase.step === 3 && (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                      <p className="text-sm text-yellow-400 font-semibold mb-2">🟡 Inasubiri Utetezi wa Mfanyakazi (WSOD)</p>
                      <p className="text-xs text-gray-400">Sheria inamtaka mwajiri kusubiri utetezi wa maandishi. Kitufe cha kuanza kikao kimezuiwa hadi utetezi upatikane.</p>
                    </div>
                    {!activeCase.wsodUploaded ? (
                      <button onClick={handleSimulateUploadWSOD} className="w-full py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-all border border-dashed border-gray-400">
                        (Bypass) Weka Alama Kwamba Amewasilisha Utetezi
                      </button>
                    ) : (
                      <button onClick={() => updateCaseStep(4)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg">
                        Endelea kwenye Kikao (Start Hearing) &rarr;
                      </button>
                    )}
                  </div>
               )}

               {activeCase.step === 4 && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-300">Andaa kikao cha mtandaoni cha kinidhamu. Mwenyekiti (Chairperson) ataongoza kikao.</p>
                    <button disabled={!activeCase.wsodUploaded} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                      <Calendar size={18} /> Ratibu Kikao cha Mtandaoni (Schedule Virtual Hearing)
                    </button>
                    <button onClick={() => updateCaseStep(5)} className="w-full py-3 mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all">
                      Kikao Kimefanyika (Mark Complete) &rarr;
                    </button>
                  </div>
               )}

               {activeCase.step === 5 && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-300">Toa uamuzi wa mwisho kwa maandishi. Inaweza kuwa Onyo, Kusimamishwa, au Kufukuzwa kazi.</p>
                    <button onClick={() => {
                      updateCaseStep(6, { documents: [...(activeCase.documents || []), { title: 'Final Decision Letter', type: 'Decision', date: new Date().toISOString(), url: '#' }] });
                    }} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                      <Check size={18} /> Pakia Uamuzi na Funga Kesi (Upload Decision)
                    </button>
                  </div>
               )}

               {activeCase.step > 5 && (
                  <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-xl text-center">
                    <h3 className="text-lg font-bold text-green-400 mb-2">Kesi Imefungwa (Closed)</h3>
                    <p className="text-sm text-gray-300">Mchakato wote wa kinidhamu umekamilika na nyaraka zote zimehifadhiwa kisheria.</p>
                  </div>
               )}
            </div>

            {/* Right: Document Vault */}
            <div className="lg:col-span-1 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4 h-fit">
               <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                  <Archive size={18} className="text-blue-400" /> Document Vault
               </h2>
               <div className="flex flex-col gap-3">
                 {activeCase.documents && activeCase.documents.length > 0 ? (
                   activeCase.documents.map((doc, idx) => (
                     <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex flex-col gap-1 hover:border-blue-500 cursor-pointer transition-colors group">
                       <div className="flex items-start gap-2">
                         <FileText size={14} className="text-gray-400 mt-1 group-hover:text-blue-400" />
                         <span className="text-xs font-semibold text-gray-200 leading-tight">{doc.title}</span>
                       </div>
                       <span className="text-[9px] text-gray-500 ml-6">{new Date(doc.date).toLocaleString()}</span>
                     </div>
                   ))
                 ) : (
                   <p className="text-xs text-gray-500 text-center py-4 italic">Hakuna nyaraka iliyopakiwa bado.</p>
                 )}
               </div>
            </div>
         </div>
       </section>
    );
  }

  if (activeView === 'terminations_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-full text-red-400">
              <DoorOpen size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Terminations Dashboard</h1>
              <p className="text-sm text-red-400 font-medium mt-1">Usimamizi wa Kisheria (ELRA Cap 366 & G.N. No. 42 of 2007)</p>
            </div>
          </div>
          <button onClick={() => { setTerminatingEmployee(null); setActiveView('employee_directory'); }} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Directory
          </button>
        </div>

        <div className="flex flex-col gap-10">

          {/* Mwombaji Anayesitishwa Info */}
          {terminatingEmployee ? (
            <div className="flex items-center gap-5 bg-gray-800/60 p-5 rounded-2xl border border-red-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
              <img src={terminatingEmployee.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-red-500 object-cover shadow-lg" />
              <div className="flex flex-col">
                <h3 className="font-bold text-white text-xl uppercase tracking-wider">{terminatingEmployee.name}</h3>
                <p className="text-sm text-gray-300 font-medium">{terminatingEmployee.role} &bull; <span className="text-blue-400">{terminatingEmployee.department}</span></p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><UserMinus size={12}/> ID: {terminatingEmployee.empId}</p>
              </div>
              <div className="ml-auto hidden sm:block">
                <span className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 shadow-inner uppercase tracking-widest">
                  Target for Termination
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-400 text-sm font-bold">
              <AlertTriangle size={20} />
              Tafadhali rudi kwenye 'Employee Directory' na uchague mfanyakazi unayetaka kumsitisha (Process Termination).
            </div>
          )}
          
          {/* SUB-PART 1: Forms of Termination */}
          <div className="flex flex-col gap-5">
             <h2 className="text-xl font-bold border-b border-gray-700 pb-3 text-blue-400 flex items-center gap-2">
               <FileSignature size={24}/> Sub-Part 1: Forms of Termination (Njia za Usitishaji)
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
               
               <div className="bg-gray-800/40 border border-blue-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-blue-500 transition-all flex flex-col gap-3 group shadow-lg">
                 <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform"><FileSignature size={20}/></div>
                 <div>
                   <h3 className="font-bold text-gray-200 text-sm">By Agreement</h3>
                   <p className="text-xs text-gray-400 mt-1">Usitishaji wa makubaliano (Mutual separation).</p>
                 </div>
                 <button onClick={() => { setMsaStep(1); setActiveView('msa_dashboard'); }} className="mt-auto w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors">Simamia</button>
               </div>

               <div className="bg-gray-800/40 border border-blue-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-blue-500 transition-all flex flex-col gap-3 group shadow-lg">
                 <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform"><Clock size={20}/></div>
                 <div>
                   <h3 className="font-bold text-gray-200 text-sm">Automatic Termination</h3>
                   <p className="text-xs text-gray-400 mt-1">Mkataba kuisha (Fixed term contract).</p>
                 </div>
                 <button onClick={() => { setAutoTermStep(1); setActiveView('automatic_termination_dashboard'); }} className="mt-auto w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors">Simamia</button>
               </div>

               <div className="bg-gray-800/40 border border-blue-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-blue-500 transition-all flex flex-col gap-3 group shadow-lg">
                 <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform"><UserMinus size={20}/></div>
                 <div>
                   <h3 className="font-bold text-gray-200 text-sm">Resignation</h3>
                   <p className="text-xs text-gray-400 mt-1">Mfanyakazi kuacha kazi mwenyewe.</p>
                 </div>
                 <button onClick={() => { setResignationStep(1); setClearanceStatus({ it: false, finance: false, operations: false }); setActiveView('resignation_dashboard'); }} className="mt-auto w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors">Simamia</button>
               </div>

               <div className="bg-gray-800/40 border border-red-500/40 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-red-500 transition-all flex flex-col gap-3 group shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">RISK</div>
                 <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl w-fit group-hover:scale-110 transition-transform"><ShieldAlert size={20}/></div>
                 <div>
                   <h3 className="font-bold text-red-300 text-sm">Constructive Termination</h3>
                   <p className="text-xs text-gray-400 mt-1">Malalamiko ya mfanyakazi kulazimishwa kuacha kazi.</p>
                 </div>
                 <button className="mt-auto w-full py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors">Simamia</button>
               </div>

               <div className="bg-gray-800/40 border border-blue-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-blue-500 transition-all flex flex-col gap-3 group shadow-lg">
                 <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl w-fit group-hover:scale-110 transition-transform"><Eye size={20}/></div>
                 <div>
                   <h3 className="font-bold text-gray-200 text-sm">Probationary Employees</h3>
                   <p className="text-xs text-gray-400 mt-1">Usitishaji wakati wa matazamio.</p>
                 </div>
                 <button className="mt-auto w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors">Simamia</button>
               </div>

             </div>
          </div>

          {/* SUB-PART 2: Termination by Employer */}
          <div className="flex flex-col gap-5">
             <h2 className="text-xl font-bold border-b border-gray-700 pb-3 text-orange-400 flex items-center gap-2">
               <Scale size={24}/> Sub-Part 2: Termination by Employer (Sababu za Kiutendaji na Tabia)
             </h2>
             <p className="text-sm text-gray-400 -mt-2 mb-2">Hii ndiyo sehemu nyeti zaidi inayohitaji <span className="font-bold text-white">"Fair Reasons & Fair Procedures"</span>.</p>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Misconduct */}
               <div className="bg-gray-800/40 border border-orange-500/30 p-6 rounded-2xl hover:border-orange-500 transition-all flex flex-col gap-4 shadow-lg relative">
                 <div className="flex items-center gap-3 border-b border-gray-700/50 pb-3">
                   <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl"><Gavel size={24}/></div>
                   <h3 className="font-bold text-white text-lg uppercase tracking-wider">Misconduct</h3>
                 </div>
                 <p className="text-xs text-orange-300 font-semibold">(Utovu wa Nidhamu)</p>
                 <ul className="flex flex-col gap-3 flex-1 mt-2">
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Kushughulikia mwenendo (Managing conduct).</li>
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Haki ya sababu na utaratibu (Fairness of reason/procedure).</li>
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Migomo isiyo halali (Unlawful strikes).</li>
                 </ul>
                 <button className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg">Fungua Jalada la Nidhamu</button>
               </div>

               {/* Incapacity */}
               <div className="bg-gray-800/40 border border-orange-500/30 p-6 rounded-2xl hover:border-orange-500 transition-all flex flex-col gap-4 shadow-lg relative">
                 <div className="flex items-center gap-3 border-b border-gray-700/50 pb-3">
                   <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl"><TrendingDown size={24}/></div>
                   <h3 className="font-bold text-white text-lg uppercase tracking-wider">Incapacity</h3>
                 </div>
                 <p className="text-xs text-orange-300 font-semibold">(Kushindwa Kazi)</p>
                 <ul className="flex flex-col gap-4 flex-1 mt-2">
                   <li className="flex flex-col gap-1 text-sm text-gray-300">
                     <span className="font-bold text-white flex items-center gap-2"><TrendingDown size={14} className="text-orange-500"/> Poor Work Performance:</span>
                     <span className="text-xs text-gray-400 pl-5">Kushindwa kufikia viwango vya kazi (Inahitaji ushahidi wa mafunzo na maonyo).</span>
                   </li>
                   <li className="flex flex-col gap-1 text-sm text-gray-300">
                     <span className="font-bold text-white flex items-center gap-2"><HeartPulse size={14} className="text-orange-500"/> Ill-health or Injury:</span>
                     <span className="text-xs text-gray-400 pl-5">Ugonjwa au majeraha (Inajumuisha ulinzi wa HIV/AIDS Status).</span>
                   </li>
                   <li className="flex flex-col gap-1 text-sm text-gray-300">
                     <span className="font-bold text-white flex items-center gap-2"><Users size={14} className="text-orange-500"/> Incompatibility:</span>
                     <span className="text-xs text-gray-400 pl-5">Kutopatana mahali pa kazi (Kushindwa kuendana na utamaduni wa ofisi).</span>
                   </li>
                 </ul>
                 <button className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg">Tathmini Uwezo (Assess)</button>
               </div>

               {/* Operational Requirements */}
               <div className="bg-gray-800/40 border border-orange-500/30 p-6 rounded-2xl hover:border-orange-500 transition-all flex flex-col gap-4 shadow-lg relative">
                 <div className="flex items-center gap-3 border-b border-gray-700/50 pb-3">
                   <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl"><Briefcase size={24}/></div>
                   <h3 className="font-bold text-white text-lg uppercase tracking-wider leading-tight">Operational Requirements</h3>
                 </div>
                 <p className="text-xs text-orange-300 font-semibold">(Retrenchment / Kupunguza Wafanyakazi)</p>
                 <ul className="flex flex-col gap-3 flex-1 mt-2">
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Kupunguza wafanyakazi kwa sababu za kiuchumi au kimuundo.</li>
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Inahitaji vigezo wazi vya uteuzi (Selection criteria).</li>
                   <li className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-orange-500 mt-0.5 shrink-0"/> Haki ya kuajiriwa tena ikitokea nafasi (Preference in rehiring).</li>
                 </ul>
                 <button className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg">Anzisha Mchakato (Retrench)</button>
               </div>

             </div>
          </div>

          {/* SUB-PART 3: Post-Termination Compliance */}
          <div className="flex flex-col gap-5">
             <h2 className="text-xl font-bold border-b border-gray-700 pb-3 text-green-400 flex items-center gap-2">
               <Check size={24}/> Sub-Part 3: Post-Termination Compliance (Haki za Mwisho)
             </h2>
             <p className="text-sm text-gray-400 -mt-2 mb-2">Baada ya kuchagua aina ya usitishaji, mfumo unahakikisha malipo na stahiki hizi zimekamilika:</p>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               
               <div className="bg-gray-800/40 border border-green-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-green-500 transition-all flex items-start gap-4 group shadow-lg">
                 <div className="p-3 bg-green-500/20 text-green-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Bell size={24}/></div>
                 <div className="flex flex-col">
                   <h3 className="font-bold text-gray-200 text-sm mb-1">Notice of Termination</h3>
                   <p className="text-xs text-gray-400">Kipindi cha notisi au malipo badala ya notisi.</p>
                 </div>
               </div>

               <div className="bg-gray-800/40 border border-green-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-green-500 transition-all flex items-start gap-4 group shadow-lg">
                 <div className="p-3 bg-green-500/20 text-green-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Banknote size={24}/></div>
                 <div className="flex flex-col">
                   <h3 className="font-bold text-gray-200 text-sm mb-1">Severance Pay</h3>
                   <p className="text-xs text-gray-400">Kiinua mgongo (Kama mkataba na sheria vinavyoelekeza).</p>
                 </div>
               </div>

               <div className="bg-gray-800/40 border border-green-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-green-500 transition-all flex items-start gap-4 group shadow-lg">
                 <div className="p-3 bg-green-500/20 text-green-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Truck size={24}/></div>
                 <div className="flex flex-col">
                   <h3 className="font-bold text-gray-200 text-sm mb-1">Transport Allowance</h3>
                   <p className="text-xs text-gray-400">Nauli ya kurudi sehemu aliyoajiriwa au nyumbani.</p>
                 </div>
               </div>

               <div className="bg-gray-800/40 border border-green-500/30 p-5 rounded-2xl hover:bg-gray-800/80 hover:border-green-500 transition-all flex items-start gap-4 group shadow-lg">
                 <div className="p-3 bg-green-500/20 text-green-400 rounded-xl shrink-0 group-hover:scale-110 transition-transform"><Award size={24}/></div>
                 <div className="flex flex-col">
                   <h3 className="font-bold text-gray-200 text-sm mb-1">Certificate of Service</h3>
                   <p className="text-xs text-gray-400">Cheti cha utumishi na utendaji wake kazini.</p>
                 </div>
               </div>

             </div>
          </div>

        </div>
      </section>
    );
  }

  if (activeView === 'msa_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header - The Collaborative Separation Hub */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
              <Handshake size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mutual Separation Portal</h1>
              <p className="text-sm text-blue-400 font-medium mt-1">The Collaborative Separation Hub (MSA-2026-004)</p>
            </div>
          </div>
          <button onClick={() => setActiveView('terminations_dashboard')} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Terminations
          </button>
        </div>

        {!terminatingEmployee ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-400 text-sm font-bold">
              <AlertTriangle size={20} />
              Tafadhali rudi kwenye 'Employee Directory' na uchague mfanyakazi unayetaka kumsitisha.
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kushoto: Summary & Proposal */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col items-center text-center gap-4">
                <img src={terminatingEmployee.avatar} alt="Avatar" className="w-28 h-28 rounded-full border-4 border-gray-600 object-cover shadow-lg" />
                <div>
                  <h3 className="font-bold text-white text-xl uppercase tracking-wider">{terminatingEmployee.name}</h3>
                  <p className="text-sm text-gray-300 font-medium">{terminatingEmployee.role}</p>
                  <p className="text-xs text-blue-400 font-bold mt-1 px-3 py-1.5 bg-blue-900/20 rounded-lg inline-block border border-blue-500/30">{terminatingEmployee.department}</p>
                </div>
                <div className="w-full h-px bg-gray-700 my-2"></div>
                <div className="w-full text-left text-sm text-gray-300 flex flex-col gap-3">
                  <div className="flex justify-between"><span className="text-gray-400">Employee ID:</span> <span className="font-mono">{terminatingEmployee.empId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Joined Date:</span> <span>12 Jan 2023</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Tenure:</span> <span className="font-bold text-white">3 Yrs, 2 Mos</span></div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-blue-500/30 pb-3">
                  <Banknote className="text-blue-400" size={20} />
                  <h3 className="font-bold text-white">Proposed Ex-Gratia</h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">Kiasi cha ziada (nje ya stahiki za kisheria) kinachotolewa kama motisha ya kukubali usitishaji huu.</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">TZS</span>
                  <input type="text" defaultValue="5,000,000" className="w-full rounded-xl bg-gray-900 py-3 pl-14 pr-4 text-white font-bold border border-gray-600 focus:border-blue-500 outline-none" />
                </div>
                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors">Update Offer</button>
              </div>
            </div>

            {/* Kulia: The Legal Workflow Pipeline */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Scale className="text-gray-400" size={24}/> The Legal Workflow Pipeline
                </h2>
                
                <div className="flex flex-col gap-4 relative">
                  {/* Line in the background */}
                  <div className="absolute left-[27px] top-6 bottom-10 w-0.5 bg-gray-700 -z-10"></div>

                  {/* Step 1: Offer Generation */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${msaStep === 1 ? 'bg-gray-800/80 border border-blue-500/50 shadow-md' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${msaStep > 1 ? 'border-green-500 text-green-400' : msaStep === 1 ? 'border-blue-500 text-blue-400' : 'border-gray-600 text-gray-500'}`}>
                      {msaStep > 1 ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${msaStep >= 1 ? 'text-white' : 'text-gray-500'}`}>1. Offer Generation</h3>
                      <p className="text-sm text-gray-400 mt-1">Mwajiri anatengeneza ofa rasmi ya maandishi (MSA Offer Letter).</p>
                      {msaStep === 1 && (
                        <button onClick={() => setMsaStep(2)} className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Draft Offer Letter</button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Employee Consultation */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${msaStep === 2 ? 'bg-gray-800/80 border border-blue-500/50 shadow-md' : msaStep < 2 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${msaStep > 2 ? 'border-green-500 text-green-400' : msaStep === 2 ? 'border-blue-500 text-blue-400' : 'border-gray-600 text-gray-500'}`}>
                      {msaStep > 2 ? <CheckCircle2 size={24} /> : msaStep === 2 ? <Users size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${msaStep >= 2 ? 'text-white' : 'text-gray-500'}`}>2. Employee Consultation</h3>
                      <p className="text-sm text-gray-400 mt-1">Kipindi cha hiari cha mfanyakazi kupitia na kuridhia ofa iliyotolewa.</p>
                      {msaStep === 2 && (
                        <button onClick={() => setMsaStep(3)} className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Record Consultation & Proceed</button>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Drafting Agreement */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${msaStep === 3 ? 'bg-gray-800/80 border border-blue-500/50 shadow-md' : msaStep < 3 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${msaStep > 3 ? 'border-green-500 text-green-400' : msaStep === 3 ? 'border-blue-500 text-blue-400' : 'border-gray-600 text-gray-500'}`}>
                      {msaStep > 3 ? <CheckCircle2 size={24} /> : msaStep === 3 ? <FileSignature size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${msaStep >= 3 ? 'text-white' : 'text-gray-500'}`}>3. Drafting Agreement</h3>
                      <p className="text-sm text-gray-400 mt-1">Mkataba kamili wa usitishaji (Separation Agreement) unatengenezwa kisheria.</p>
                      {msaStep === 3 && (
                        <button onClick={() => setMsaStep(4)} className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Generate Agreement</button>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Signing & Execution */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${msaStep === 4 ? 'bg-gray-800/80 border border-green-500/50 shadow-md' : msaStep < 4 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${msaStep > 4 ? 'border-green-500 text-green-400' : msaStep === 4 ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-500'}`}>
                      {msaStep > 4 ? <CheckCircle2 size={24} /> : msaStep === 4 ? <Handshake size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${msaStep >= 4 ? 'text-white' : 'text-gray-500'}`}>4. Signing & Execution</h3>
                      <p className="text-sm text-gray-400 mt-1">Pande zote zinasaini mkataba rasmi kufunga mchakato.</p>
                      {msaStep === 4 && (
                        <button onClick={() => { setMsaStep(5); toast.success("MSA Imekamilika kikamilifu!"); }} className="mt-3 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Finalize & Execute Separation</button>
                      )}
                      {msaStep > 4 && (
                        <p className="text-sm text-green-400 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={16}/> Mchakato Umekamilika</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Closure Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                  <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Check size={18} className="text-green-400"/> Final Payouts</h3>
                  <p className="text-xs text-gray-400 mb-2">Kikokotoo cha malipo ya mwisho (Severance, Notice Pay, Transport).</p>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Severance Pay</span> <span className="font-bold">TZS 1,200,000</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Notice Pay</span> <span className="font-bold">TZS 800,000</span></div>
                  <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2"><span className="text-gray-300">Total Settlement</span> <span className="font-bold text-green-400">TZS 7,000,000</span></div>
                </div>
                <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                  <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Archive size={18} className="text-orange-400"/> Document Vault</h3>
                  <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline"><FileCheck size={16}/> <span>MSA Offer Letter.pdf</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Signed MSA Agreement (Pending)</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Certificate of Service (Pending)</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (activeView === 'automatic_termination_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header - The Contract End Hub */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-400">
              <Clock size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Automatic Contract Termination</h1>
              <p className="text-sm text-yellow-400 font-medium mt-1">The Contract End Hub (FT-2026-005)</p>
            </div>
          </div>
          <button onClick={() => setActiveView('terminations_dashboard')} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Terminations
          </button>
        </div>

        {!terminatingEmployee ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-400 text-sm font-bold">
              <AlertTriangle size={20} />
              Tafadhali rudi kwenye 'Employee Directory' na uchague mfanyakazi.
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Kushoto: Contract Summary & Countdown */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col items-center text-center gap-4">
                <img src={terminatingEmployee.avatar} alt="Avatar" className="w-28 h-28 rounded-full border-4 border-gray-600 object-cover shadow-lg" />
                <div>
                  <h3 className="font-bold text-white text-xl uppercase tracking-wider">{terminatingEmployee.name}</h3>
                  <p className="text-sm text-gray-300 font-medium">{terminatingEmployee.role}</p>
                  <p className="text-xs text-yellow-400 font-bold mt-1 px-3 py-1.5 bg-yellow-900/20 rounded-lg inline-block border border-yellow-500/30">{terminatingEmployee.department}</p>
                </div>
                <div className="w-full h-px bg-gray-700 my-2"></div>
                <div className="w-full text-left text-sm text-gray-300 flex flex-col gap-3">
                  <div className="flex justify-between"><span className="text-gray-400">Employee ID:</span> <span className="font-mono">{terminatingEmployee.empId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Start Date:</span> <span>15 May 2024</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">End Date:</span> <span className="font-bold text-white">14 May 2026</span></div>
                </div>
              </div>

              {/* Contract End Countdown */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-6 rounded-2xl shadow-lg flex flex-col gap-4">
                <div className="flex items-center justify-center gap-3 border-b border-yellow-500/30 pb-3">
                  <Clock className="text-yellow-400 animate-pulse" size={20} />
                  <h3 className="font-bold text-white">Contract End Countdown</h3>
                </div>
                <div className="text-center py-2">
                  <span className="text-6xl font-black text-yellow-400">28</span>
                  <p className="text-sm text-gray-300 mt-2 font-bold uppercase tracking-widest">Days Left</p>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-center">
                  <p className="text-xs text-yellow-200">Sheria (ELRA) inataka mwajiri atoe notisi ya angalau siku 30 au malipo badala ya notisi kabla mkataba haujaisha.</p>
                </div>
              </div>
            </div>

            {/* Kulia/Katikati: The Automated Workflow Pipeline */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Scale className="text-gray-400" size={24}/> The Automated Workflow Pipeline
                </h2>
                
                <div className="flex flex-col gap-4 relative">
                  {/* Line in the background */}
                  <div className="absolute left-[27px] top-6 bottom-10 w-0.5 bg-gray-700 -z-10"></div>

                  {/* Step 1: Issue End of Contract Notice */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${autoTermStep === 1 ? 'bg-gray-800/80 border border-yellow-500/50 shadow-md' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${autoTermStep > 1 ? 'border-green-500 text-green-400' : autoTermStep === 1 ? 'border-yellow-500 text-yellow-400' : 'border-gray-600 text-gray-500'}`}>
                      {autoTermStep > 1 ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${autoTermStep >= 1 ? 'text-white' : 'text-gray-500'}`}>1. Issue End of Contract Notice</h3>
                      <p className="text-sm text-gray-400 mt-1">Mfumo unatengeneza barua rasmi ya maandishi kuarifu kuisha kwa mkataba.</p>
                      {autoTermStep === 1 && (
                        <button onClick={() => setAutoTermStep(2)} className="mt-3 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Draft Notice Letter</button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Notification Sent */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${autoTermStep === 2 ? 'bg-gray-800/80 border border-yellow-500/50 shadow-md' : autoTermStep < 2 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${autoTermStep > 2 ? 'border-green-500 text-green-400' : autoTermStep === 2 ? 'border-yellow-500 text-yellow-400' : 'border-gray-600 text-gray-500'}`}>
                      {autoTermStep > 2 ? <CheckCircle2 size={24} /> : autoTermStep === 2 ? <Send size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${autoTermStep >= 2 ? 'text-white' : 'text-gray-500'}`}>2. Notification Sent</h3>
                      <p className="text-sm text-gray-400 mt-1">Barua inatumwa rasmi kwa email ya mfanyakazi na kuhifadhiwa kwenye mfumo.</p>
                      {autoTermStep === 2 && (
                        <button onClick={() => setAutoTermStep(3)} className="mt-3 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg flex items-center gap-2"><Send size={16}/> Dispatch Notice</button>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Finalize Final Payments */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${autoTermStep === 3 ? 'bg-gray-800/80 border border-yellow-500/50 shadow-md' : autoTermStep < 3 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${autoTermStep > 3 ? 'border-green-500 text-green-400' : autoTermStep === 3 ? 'border-yellow-500 text-yellow-400' : 'border-gray-600 text-gray-500'}`}>
                      {autoTermStep > 3 ? <CheckCircle2 size={24} /> : autoTermStep === 3 ? <Banknote size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${autoTermStep >= 3 ? 'text-white' : 'text-gray-500'}`}>3. Finalize Final Payments</h3>
                      <p className="text-sm text-gray-400 mt-1">Kikokotoo cha malipo ya mwisho kisheria (Kama kuna malipo ya likizo au Severance Pay).</p>
                      {autoTermStep === 3 && (
                        <button onClick={() => setAutoTermStep(4)} className="mt-3 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Finalize Payments</button>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Process Separation */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${autoTermStep === 4 ? 'bg-gray-800/80 border border-green-500/50 shadow-md' : autoTermStep < 4 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${autoTermStep > 4 ? 'border-green-500 text-green-400' : autoTermStep === 4 ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-500'}`}>
                      {autoTermStep > 4 ? <CheckCircle2 size={24} /> : autoTermStep === 4 ? <Archive size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${autoTermStep >= 4 ? 'text-white' : 'text-gray-500'}`}>4. Process Separation</h3>
                      <p className="text-sm text-gray-400 mt-1">Hatua ya mwisho inahitimisha mkataba, na mfanyakazi anapewa Cheti cha Utumishi.</p>
                      {autoTermStep === 4 && (
                        <button onClick={() => { setAutoTermStep(5); toast.success("Automatic Termination Imekamilika kikamilifu!"); }} className="mt-3 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Finalize Separation</button>
                      )}
                      {autoTermStep > 4 && (
                        <p className="text-sm text-green-400 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={16}/> Mchakato Umekamilika</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Vault & Final Payouts Calculation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                  <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Check size={18} className="text-green-400"/> Final Payouts Calculation</h3>
                  <p className="text-xs text-gray-400 mb-2">Malipo stahiki ya mwisho ya mfanyakazi.</p>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Severance Pay</span> <span className="font-bold">TZS 0</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Accrued Leave</span> <span className="font-bold">TZS 250,000</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Transport Allowance</span> <span className="font-bold">TZS 100,000</span></div>
                  <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2"><span className="text-gray-300">Total Settlement</span> <span className="font-bold text-green-400">TZS 350,000</span></div>
                </div>
                <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                  <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Archive size={18} className="text-orange-400"/> Document Vault</h3>
                  <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline"><FileCheck size={16}/> <span>End of Contract Notice.pdf</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Final Payment Receipt (Pending)</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Certificate of Service (Pending)</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (activeView === 'resignation_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header - Exit Management Hub */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400">
              <DoorOpen size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Resignation Management Portal</h1>
              <p className="text-sm text-cyan-400 font-medium mt-1">The Exit Management Hub (RES-2026-012)</p>
            </div>
          </div>
          <button onClick={() => setActiveView('terminations_dashboard')} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Terminations
          </button>
        </div>

        {!terminatingEmployee ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-400 text-sm font-bold">
              <AlertTriangle size={20} />
              Tafadhali rudi kwenye 'Employee Directory' na uchague mfanyakazi.
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Kushoto: Resignation Profile & Countdown (col-span-1) */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col items-center text-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
                <img src={terminatingEmployee.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-gray-600 object-cover shadow-lg mt-2" />
                <div>
                  <h3 className="font-bold text-white text-xl uppercase tracking-wider">{terminatingEmployee.name}</h3>
                  <p className="text-sm text-gray-300 font-medium">{terminatingEmployee.role}</p>
                </div>
                <div className="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30 uppercase tracking-widest">
                  Resignation Submitted
                </div>
                <div className="w-full h-px bg-gray-700 my-1"></div>
                <div className="w-full text-left text-sm text-gray-300 flex flex-col gap-3">
                  <div className="flex justify-between"><span className="text-gray-400">Emp ID:</span> <span className="font-mono">{terminatingEmployee.empId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Notice Given:</span> <span>08 Apr 2026</span></div>
                </div>
              </div>

              {/* Notice Period Countdown */}
              <div className="bg-cyan-900/20 border border-cyan-500/30 p-6 rounded-2xl shadow-lg flex flex-col gap-4 text-center">
                <div className="flex items-center justify-center gap-3 border-b border-cyan-500/30 pb-3">
                  <Clock className="text-cyan-400 animate-pulse" size={20} />
                  <h3 className="font-bold text-white">Notice Countdown</h3>
                </div>
                <div className="py-2">
                  <span className="text-6xl font-black text-cyan-400">30</span>
                  <p className="text-sm text-gray-300 mt-2 font-bold uppercase tracking-widest">Days Left</p>
                </div>
                <p className="text-xs text-cyan-200 bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                  Siku za mwisho za kukamilisha makabidhiano.
                </p>
              </div>
            </div>

            {/* Katikati: Resignation Workflow Pipeline (col-span-2) */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <Scale className="text-gray-400" size={24}/> Resignation Workflow
                </h2>
                
                <div className="flex flex-col gap-4 relative">
                  <div className="absolute left-[27px] top-6 bottom-10 w-0.5 bg-gray-700 -z-10"></div>

                  {/* Step 1: Notice Received & Logged */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${resignationStep === 1 ? 'bg-gray-800/80 border border-cyan-500/50 shadow-md' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${resignationStep > 1 ? 'border-green-500 text-green-400' : resignationStep === 1 ? 'border-cyan-500 text-cyan-400' : 'border-gray-600 text-gray-500'}`}>
                      {resignationStep > 1 ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${resignationStep >= 1 ? 'text-white' : 'text-gray-500'}`}>1. Notice Received & Logged</h3>
                      <p className="text-sm text-gray-400 mt-1">Kupokea barua ya kujiuzulu na kurekodi tarehe rasmi ya mwisho wa kazi.</p>
                      {resignationStep === 1 && (
                        <button onClick={() => setResignationStep(2)} className="mt-3 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Acknowledge Notice</button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Exit Interview */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${resignationStep === 2 ? 'bg-gray-800/80 border border-cyan-500/50 shadow-md' : resignationStep < 2 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${resignationStep > 2 ? 'border-green-500 text-green-400' : resignationStep === 2 ? 'border-cyan-500 text-cyan-400' : 'border-gray-600 text-gray-500'}`}>
                      {resignationStep > 2 ? <CheckCircle2 size={24} /> : resignationStep === 2 ? <Users size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${resignationStep >= 2 ? 'text-white' : 'text-gray-500'}`}>2. Exit Interview</h3>
                      <p className="text-sm text-gray-400 mt-1">Mahojiano ya kuondoka ili kuboresha kampuni na kuthibitisha hakuondoka kwa shinikizo.</p>
                      {resignationStep === 2 && (
                        <button onClick={() => setResignationStep(3)} className="mt-3 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Record Interview Notes</button>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Clearance Process */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${resignationStep === 3 ? 'bg-gray-800/80 border border-cyan-500/50 shadow-md' : resignationStep < 3 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${resignationStep > 3 ? 'border-green-500 text-green-400' : resignationStep === 3 ? 'border-cyan-500 text-cyan-400' : 'border-gray-600 text-gray-500'}`}>
                      {resignationStep > 3 ? <CheckCircle2 size={24} /> : resignationStep === 3 ? <ClipboardList size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${resignationStep >= 3 ? 'text-white' : 'text-gray-500'}`}>3. Clearance Process</h3>
                      <p className="text-sm text-gray-400 mt-1">Uhakiki wa mali za kampuni na makabidhiano.</p>
                      {resignationStep === 3 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => setClearanceStatus(prev => ({...prev, it: !prev.it}))} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${clearanceStatus.it ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-900 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>IT Clearance {clearanceStatus.it && '✓'}</button>
                          <button onClick={() => setClearanceStatus(prev => ({...prev, finance: !prev.finance}))} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${clearanceStatus.finance ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-900 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>Finance {clearanceStatus.finance && '✓'}</button>
                          <button onClick={() => setClearanceStatus(prev => ({...prev, operations: !prev.operations}))} className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${clearanceStatus.operations ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-900 text-gray-400 border-gray-600 hover:bg-gray-700'}`}>Operations {clearanceStatus.operations && '✓'}</button>
                        </div>
                      )}
                      {resignationStep === 3 && clearanceStatus.it && clearanceStatus.finance && clearanceStatus.operations && (
                        <button onClick={() => setResignationStep(4)} className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Confirm All Clearances</button>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Final Settlement */}
                  <div className={`flex items-start gap-5 p-4 rounded-xl transition-all ${resignationStep === 4 ? 'bg-gray-800/80 border border-cyan-500/50 shadow-md' : resignationStep < 4 ? 'opacity-50' : ''}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 bg-gray-900 ${resignationStep > 4 ? 'border-green-500 text-green-400' : resignationStep === 4 ? 'border-cyan-500 text-cyan-400' : 'border-gray-600 text-gray-500'}`}>
                      {resignationStep > 4 ? <CheckCircle2 size={24} /> : resignationStep === 4 ? <Banknote size={24} /> : <Lock size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className={`font-bold text-lg ${resignationStep >= 4 ? 'text-white' : 'text-gray-500'}`}>4. Final Settlement</h3>
                      <p className="text-sm text-gray-400 mt-1">Malipo ya mwisho (Mshahara, Likizo) yamekokotolewa kisheria.</p>
                      {resignationStep === 4 && (
                        <button onClick={() => { setResignationStep(5); toast.success("Mchakato umekamilika. Mfanyakazi ameondolewa kwa amani!"); }} className="mt-3 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg">Approve Payouts & Finalize</button>
                      )}
                      {resignationStep > 4 && (
                        <p className="text-sm text-green-400 font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={16}/> Resignation Finalized</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kulia: Final Compliance & Documents (col-span-1) */}
            <div className="flex flex-col gap-6 lg:col-span-3 xl:col-span-1">
              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Check size={18} className="text-green-400"/> Final Payouts</h3>
                <p className="text-xs text-gray-400 mb-2">Makadirio ya malipo ya mwisho.</p>
                <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Pending Salary</span> <span className="font-bold">TZS 450,000</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-gray-300">Unused Leave</span> <span className="font-bold">TZS 120,000</span></div>
                <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2"><span className="text-gray-300">Total Net Pay</span> <span className="font-bold text-green-400">TZS 570,000</span></div>
              </div>
              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
                <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Archive size={18} className="text-orange-400"/> Document Vault</h3>
                <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline"><FileCheck size={16}/> <span>Resignation Letter.pdf</span></div>
                <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline"><FileCheck size={16}/> <span>Exit Interview Notes.pdf</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Clearance Form (Pending)</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><Lock size={14}/> <span>Certificate of Service (Pending)</span></div>
              </div>
            </div>

          </div>
        )}
      </section>
    );
  }

  if (activeView === 'leave_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
              <Calendar size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Leave Management Hub</h1>
              <p className="text-sm text-emerald-400 font-medium mt-1">Usimamizi wa Likizo (ELRA Cap 366)</p>
            </div>
          </div>
          <button onClick={() => setActiveView('employee_dashboard')} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Kushoto: Statutory Balances */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2">Statutory Balances</h2>
            
            {/* Annual Leave */}
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg shadow-inner">🏖️</div>
              <span className="font-bold text-emerald-400">Annual Leave</span>
            </div>
                <span className="text-xs text-gray-400">28 Days/Yr</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
              <p className="text-xs text-gray-300 text-right">16 days remaining</p>
            </div>

            {/* Sick Leave */}
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-lg shadow-inner">🤒</div>
              <span className="font-bold text-blue-400">Sick Leave</span>
            </div>
                <span className="text-xs text-gray-400">126 Days/3Yrs</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
              <p className="text-xs text-gray-300 text-right">120 days remaining</p>
            </div>

            {/* Maternity Leave */}
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-lg shadow-inner">🤰</div>
              <span className="font-bold text-pink-400">Maternity</span>
            </div>
                <span className="text-xs text-gray-400">84 Days/3Yrs</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-pink-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-xs text-gray-300 text-right">84 days available</p>
            </div>

            {/* Paternity Leave */}
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-lg shadow-inner">👨‍🍼</div>
              <span className="font-bold text-orange-400">Paternity</span>
            </div>
                <span className="text-xs text-gray-400">3 Days/3Yrs</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-xs text-gray-300 text-right">3 days available</p>
            </div>
          </div>

          {/* Katikati: Application & Pipeline */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Action Button */}
            <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div>
                 <h2 className="text-xl font-bold text-white">Need time off?</h2>
                 <p className="text-sm text-gray-300 mt-1">Submit your leave request for approval.</p>
               </div>
               <button onClick={() => setShowLeaveForm(!showLeaveForm)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all w-full sm:w-auto justify-center">
                 <FileText size={18} /> Apply for Leave
               </button>
            </div>

            {/* Leave Application Form (Toggleable) */}
            {showLeaveForm && (
               <div className="bg-gray-800/60 p-6 rounded-2xl border border-emerald-500/50 shadow-xl flex flex-col gap-4">
                 <h3 className="font-bold text-emerald-400 text-lg border-b border-gray-700 pb-2">Leave Application Form</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-300">Leave Type</label>
                     <select value={leaveTypeForm} onChange={(e) => setLeaveTypeForm(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500">
                   <option>🏖️ Annual Leave</option>
                   <option>🤒 Sick Leave</option>
                   <option>🤰 Maternity Leave</option>
                   <option>👨‍🍼 Paternity Leave</option>
                     </select>
                 {leaveTypeForm.includes('Sick Leave') && <p className="text-xs text-blue-400 mt-1">⚠️ Inahitaji Cheti cha Daktari (Medical Certificate).</p>}
                 {leaveTypeForm.includes('Maternity Leave') && <p className="text-xs text-pink-400 mt-1">⚠️ Siku 84 (au 100 kwa mapacha) kisheria.</p>}
                 {leaveTypeForm.includes('Paternity Leave') && <p className="text-xs text-orange-400 mt-1">⚠️ Siku 3 ndani ya siku 7 za uzazi.</p>}
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-300">Attachment (e.g. Medical Cert)</label>
                     <input type="file" className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm" />
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-300">Start Date</label>
                     <input type="date" className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" />
                   </div>
                   <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-300">End Date</label>
                     <input type="date" className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" />
                   </div>
                   <div className="flex flex-col gap-2 md:col-span-2">
                     <label className="text-sm text-gray-300">Reason / Remarks</label>
                     <Textarea className="bg-gray-900 border-gray-700 text-white" rows={2} placeholder="Optional reason..."></Textarea>
                   </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-2">
                   <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold transition-colors">Cancel</button>
                   <button onClick={() => { toast.success("Leave Application Submitted!"); setShowLeaveForm(false); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-bold transition-colors shadow-lg">Submit Application</button>
                 </div>
               </div>
            )}

            {/* Leave Pipeline / Recent Requests */}
            <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4">
               <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                 <Clock size={18} className="text-blue-400" /> My Recent Requests (Pipeline)
               </h2>
               
               {/* Dummy Request 1 */}
               <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-base shadow-inner">🏖️</div>
                        <h4 className="font-bold text-emerald-400">Annual Leave (10 Days)</h4>
                      </div>
                      <p className="text-xs text-gray-400 ml-9">01 Dec 2026 - 12 Dec 2026</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/30">In Progress</span>
                  </div>
                  
                  {/* Pipeline Tracker */}
                  <div className="flex items-center justify-between relative mt-2 px-2">
                    <div className="absolute left-6 right-6 top-3 h-1 bg-gray-700 -z-10"></div>
                    <div className="absolute left-6 top-3 h-1 bg-emerald-500 -z-10 transition-all" style={{ width: '50%' }}></div>
                    
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12}/></div>
                      <span className="text-[9px] text-gray-300">Submitted</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12}/></div>
                      <span className="text-[9px] text-gray-300">Supervisor</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-yellow-500 flex items-center justify-center"><Clock size={12} className="text-yellow-500"/></div>
                      <span className="text-[9px] text-yellow-400">HR Verify</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 z-10">
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center"><span className="text-[10px] text-gray-500">4</span></div>
                      <span className="text-[9px] text-gray-500">Approved</span>
                    </div>
                  </div>
               </div>

               {/* Dummy Request 2 */}
               <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 opacity-70">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-base shadow-inner">🤒</div>
                        <h4 className="font-bold text-blue-400">Sick Leave (2 Days)</h4>
                      </div>
                      <p className="text-xs text-gray-400 ml-9">15 Oct 2025 - 16 Oct 2025</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">Completed</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Kulia: Legal Rules & Vault */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Legal Guidelines */}
            <div className="bg-orange-900/20 p-5 rounded-2xl border border-orange-500/30 shadow-lg flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">LEGAL</div>
              <h3 className="font-bold text-orange-400 flex items-center gap-2 border-b border-orange-500/30 pb-2"><Scale size={18}/> Legal Guidelines</h3>
              <ul className="flex flex-col gap-3 mt-1">
                <li className="text-xs text-gray-300 leading-relaxed flex gap-2">
                  <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" /> 
                  Annual leave must be taken by agreement of both parties (Mwajiri & Mfanyakazi).
                </li>
                <li className="text-xs text-gray-300 leading-relaxed flex gap-2">
                  <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" /> 
                  Sick leave requires a certificate from a registered medical practitioner if requested.
                </li>
                <li className="text-xs text-gray-300 leading-relaxed flex gap-2">
                  <AlertTriangle size={14} className="text-orange-500 shrink-0 mt-0.5" /> 
                  Maternity leave is 84 days (or 100 for twins) within a 36-month cycle.
                </li>
              </ul>
            </div>

            {/* Document Vault */}
            <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
              <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2"><Archive size={18} className="text-blue-400"/> Document Vault</h3>
              <p className="text-xs text-gray-400 mb-1">Hifadhi na pakua viambatisho vyako.</p>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline bg-gray-900 p-2 rounded-lg border border-gray-700">
                  <FileCheck size={16}/> <span className="truncate">Medical_Certificate_Oct2025.pdf</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-900 p-2 rounded-lg border border-gray-700">
                  <Lock size={14}/> <span className="truncate">Birth_Certificate_Pending.pdf</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    );
  }

  if (activeView === 'payslips_dashboard') {
    return (
      <section className="flex size-full flex-col gap-8 text-white pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
              <Receipt size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Payslip Management Hub</h1>
              <p className="text-sm text-blue-400 font-medium mt-1">Uhasibu na Usalama (Finance & Security)</p>
            </div>
          </div>
          <button onClick={() => setActiveView('employee_dashboard')} className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-bold hover:bg-gray-600 transition-colors shadow-lg">
            &larr; Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Kushoto: Payroll Summary & Download Center */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Salary Overview</h2>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Mwezi (Month):</span>
                  <span className="font-bold text-white">April 2026</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Mapato (Gross):</span>
                  <span className="font-bold text-white">TZS 1,500,000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Makatandio (Ded.):</span>
                  <span className="font-bold text-red-400">- TZS 350,000</span>
                </div>
                <div className="w-full h-px bg-gray-700 my-1"></div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-bold">Net Salary:</span>
                  <span className="font-black text-xl text-green-400">TZS 1,150,000</span>
                </div>
              </div>
              
              <button className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">
                <FileText size={18} /> Download Current Payslip
              </button>
            </div>

            {/* Contract End Countdown */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 p-5 rounded-xl flex flex-col gap-2 text-center shadow-lg">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex justify-center gap-2 items-center"><Clock size={14}/> Contract End Countdown</h3>
              <div className="text-3xl font-black text-yellow-500 mt-1">28 Days</div>
              <p className="text-[10px] text-gray-400">Mkataba wako unaisha baada ya siku 28.</p>
            </div>
          </div>

          {/* Katikati: Interactive Payroll Chart & History */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                <BarChart size={18} className="text-blue-400" /> Payroll Trend & Payslip History
              </h2>
              
              {/* Histogram Chart */}
              <div className="h-32 flex items-end justify-between gap-3 border-b border-gray-700 pb-2 mb-4 px-2 mt-2">
                {[{m:'Oct', h: 60}, {m:'Nov', h: 65}, {m:'Dec', h: 80}, {m:'Jan', h: 80}, {m:'Feb', h: 80}, {m:'Mar', h: 100}].map((col, i) => (
                  <div key={i} className="w-full flex flex-col gap-1 items-center group relative">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-gray-800 text-[10px] px-2 py-1 rounded shadow text-white transition-opacity whitespace-nowrap z-10 border border-gray-700">TZS 1.15M</div>
                    <div className="w-full bg-blue-500/40 rounded-t-md group-hover:bg-blue-400 transition-all cursor-pointer" style={{ height: `${col.h}%` }}></div>
                    <span className="text-[10px] text-gray-400 font-medium">{col.m}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col gap-3 mt-2 overflow-y-auto max-h-[250px] pr-2 scrollbar-thin">
                {[
                  { month: 'March 2026', gross: '1,500,000', net: '1,150,000', status: 'Paid' },
                  { month: 'February 2026', gross: '1,500,000', net: '1,150,000', status: 'Paid' },
                  { month: 'January 2026', gross: '1,500,000', net: '1,150,000', status: 'Paid' },
                  { month: 'December 2025', gross: '1,400,000', net: '1,080,000', status: 'Paid' },
                ].map((slip, i) => (
                  <div key={i} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-200 text-sm">{slip.month}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">Net: TZS {slip.net} | Gross: {slip.gross}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase tracking-wider">{slip.status}</span>
                      <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1">
                        <FileText size={14} /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Separation Pipeline (From Prompt Context) */}
            <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                <Scale size={16} className="text-yellow-400" /> Separation Status
              </h2>
              <div className="flex items-center justify-between relative mt-2 px-4">
                <div className="absolute left-6 right-6 top-3.5 h-1 bg-gray-700 -z-10"></div>
                <div className="absolute left-6 top-3.5 h-1 bg-green-500 -z-10 transition-all" style={{ width: '75%' }}></div>
                
                <div className="flex flex-col items-center gap-2 z-10"><div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-gray-900"><Check size={12}/></div><span className="text-[9px] text-gray-300 font-bold">Issue Notice</span></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-gray-900"><Check size={12}/></div><span className="text-[9px] text-gray-300 font-bold">Notice Sent</span></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-gray-900"><Check size={12}/></div><span className="text-[9px] text-gray-300 font-bold">Final Payments</span></div>
                <div className="flex flex-col items-center gap-2 z-10"><div className="w-7 h-7 rounded-full bg-gray-700 text-gray-500 flex items-center justify-center border-4 border-gray-900"><Lock size={12}/></div><span className="text-[9px] text-gray-500 font-bold">Separation</span></div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Hatua 3 zimekamilika. Inasubiriwa ukamilishaji wa malipo katika hatua ya 4 (Locked).</p>
            </div>
          </div>

          {/* Kulia: Tax Breakdown & Document Vault */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
              <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
                <Banknote size={18} className="text-red-400" /> Tax & Benefits Breakdown
              </h3>
              <p className="text-xs text-gray-400 mb-1">Mchanganuo wa makatandio (Deductions) kisheria kwa mwezi huu.</p>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-300">PAYE (Kodi)</span> <span className="font-bold text-red-400">TZS 150,000</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-300">NSSF (10%)</span> <span className="font-bold text-red-400">TZS 150,000</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-300">HESLB (Bodi)</span> <span className="font-bold text-red-400">TZS 50,000</span></div>
              <div className="flex justify-between items-center text-sm border-t border-gray-700 pt-2"><span className="text-gray-300">Jumla (Total)</span> <span className="font-bold text-red-400">TZS 350,000</span></div>
            </div>

            <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700 shadow-lg flex flex-col gap-3">
              <h3 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-2">
                <Archive size={18} className="text-orange-400" /> Document Vault
              </h3>
              <p className="text-xs text-gray-400 mb-1">Nyaraka za kisheria zinazohusiana na mshahara.</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline bg-gray-900 p-2 rounded-lg border border-gray-700"><FileCheck size={16}/> <span className="truncate">Ajira_Contract_2024.pdf</span></div>
                <div className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer hover:underline bg-gray-900 p-2 rounded-lg border border-gray-700"><FileText size={16}/> <span className="truncate">Salary_Increment_2025.pdf</span></div>
                <div className="flex items-center gap-2 text-sm text-orange-400 cursor-pointer hover:underline bg-gray-900 p-2 rounded-lg border border-gray-700"><AlertTriangle size={16}/> <span className="truncate">Warning_Letter_Deduction.pdf</span></div>
              </div>
            </div>
          </div>

        </div>
      </section>
    );
  }

  return (
    <>
    <section className="flex size-full flex-col gap-6 sm:gap-10 text-white pb-10">
      <h1 className="text-3xl md:text-4xl font-extrabold">Personal Room Dashboard</h1>
      <p className="text-lg text-gray-300">
        Unlock more features by subscribing to a plan.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div key={plan.title} className="flex flex-col rounded-2xl border border-gray-700 bg-dark-1 p-6 sm:p-8 shadow-lg transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-2">
                <plan.icon className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-bold uppercase tracking-wider text-blue-300">{plan.title}</h3>
              <p className="text-sm text-gray-400">{plan.description}</p>
            </div>

            <div className="my-6 h-px bg-gray-700" />

            <div className="flex-grow">
              <ul className="space-y-3">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <Check size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-200">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-8 text-center">
              <p className="mb-6 text-4xl font-bold tracking-tight">{plan.priceDisplay}</p>
              {subscribedPlan === plan.planId ? (
                <button
                  className="w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                  onClick={() => handleOpenNow(plan.planId)}
                >
                  Open Now
                </button>
              ) : (
                <button
                  className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSubscribe(plan)}
                  disabled={plan.priceDisplay === 'Contact Us'}
                >
                  Subscribe & Pay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
    </>
  );
};

export default PersonalRoom;
