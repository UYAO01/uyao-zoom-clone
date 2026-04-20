'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { db, firebaseStorage } from '@/components/ui/firebase';

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

type Job = {
  id: string;
  companyName: string;
  jobPosition: string;
  description: string;
  qualifications: string[];
  jobType: string;
  deadline: string;
  logoUrl?: string;
  teamImageUrl?: string;
  contactPhone?: string;
  companyAddress?: string; // Mpya: Anuani ya kampuni
  createdBy?: string;
};

interface PostJobFormProps {
  editingJob: Job | null;
  setEditingJob: (job: Job | null) => void;
  setActiveView: (view: 'plans' | 'job_dashboard' | 'business_dashboard' | 'post_job_form' | 'job_posted_list' | 'business_posted_jobs' | 'business_requests') => void;
}

const PostJobForm: React.FC<PostJobFormProps> = ({ editingJob, setEditingJob, setActiveView }) => {
  const { user } = useUser();
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [postJobStep, setPostJobStep] = useState(1);
  const [jobPostData, setJobPostData] = useState({
    companyName: '',
    jobPosition: '',
    jobType: 'Full-time',
    description: '',
    deadline: '',
    contactPhone: '',
    country: 'Tanzania',
    region: '',
    poBoxType: 'P.O.Box',
    poBoxNumber: '',
  });
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [teamImage, setTeamImage] = useState<File | null>(null);
  const [qualifications, setQualifications] = useState<string[]>(['']);
  const [activeQualificationIndex, setActiveQualificationIndex] = useState(0);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // States kwa ajili ya Searchable Dropdown ya Nchi
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Funga dropdown ukibonyeza nje
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingJob) {
      let initialCountry = 'Tanzania';
      let initialRegion = '';
      let initialStreet = '';
      const rawAddress = editingJob.companyAddress || '';
      const parts = rawAddress.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        initialCountry = parts.pop() || 'Tanzania';
        initialRegion = parts.pop() || '';
        initialStreet = parts.join(', ');
      } else {
        initialStreet = rawAddress;
      }
      
      let initialPoType = 'P.O.Box';
      let initialPoNum = '';
      if (initialStreet.includes('P.O.Box')) {
        initialPoType = 'P.O.Box';
        initialPoNum = initialStreet.replace('P.O.Box', '').trim();
      } else if (initialStreet.includes('S.L.P')) {
        initialPoType = 'S.L.P';
        initialPoNum = initialStreet.replace('S.L.P', '').trim();
      } else {
        initialPoNum = initialStreet;
      }
      
      let initialPhone = editingJob.contactPhone || '';
      if (initialPhone.includes('+')) {
         const phoneParts = initialPhone.split(' ');
         if (phoneParts.length > 1) initialPhone = phoneParts.slice(1).join(' ');
      }

      setJobPostData({
        companyName: editingJob.companyName,
        jobPosition: editingJob.jobPosition,
        jobType: editingJob.jobType,
        description: editingJob.description,
        deadline: editingJob.deadline,
        contactPhone: initialPhone,
        country: initialCountry,
        region: initialRegion,
        poBoxType: initialPoType,
        poBoxNumber: initialPoNum,
      });
      setQualifications(editingJob.qualifications && editingJob.qualifications.length > 0 ? editingJob.qualifications : ['']);
      setIsDraftLoaded(false);
    } else {
      const savedDraft = localStorage.getItem('job_post_draft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        let initialCountry = draft.country || 'Tanzania';
        let initialRegion = draft.region || '';
        let initialStreet = draft.streetAddress || '';
        
        if (!draft.country && draft.companyAddress) {
           const parts = draft.companyAddress.split(',').map((p: string) => p.trim());
           if (parts.length >= 3) {
             initialCountry = parts.pop() || 'Tanzania';
             initialRegion = parts.pop() || '';
             initialStreet = parts.join(', ');
           } else {
             initialStreet = draft.companyAddress;
           }
        }
        
        let initialPoType = draft.poBoxType || 'P.O.Box';
        let initialPoNum = draft.poBoxNumber || '';
        if (!draft.poBoxNumber && initialStreet) {
           if (initialStreet.includes('P.O.Box')) {
             initialPoType = 'P.O.Box';
             initialPoNum = initialStreet.replace('P.O.Box', '').trim();
           } else if (initialStreet.includes('S.L.P')) {
             initialPoType = 'S.L.P';
             initialPoNum = initialStreet.replace('S.L.P', '').trim();
           } else {
             initialPoNum = initialStreet;
           }
        }
        
        let initialPhone = draft.contactPhone || '';
        if (initialPhone.includes('+')) {
           const phoneParts = initialPhone.split(' ');
           if (phoneParts.length > 1) initialPhone = phoneParts.slice(1).join(' ');
        }

        setJobPostData({
          companyName: draft.companyName || '',
          jobPosition: draft.jobPosition || '',
          jobType: draft.jobType || 'Full-time',
          description: draft.description || '',
          deadline: draft.deadline || '',
          contactPhone: initialPhone,
          country: initialCountry,
          region: initialRegion,
          poBoxType: initialPoType,
          poBoxNumber: initialPoNum,
        });
        setQualifications(draft.qualifications && draft.qualifications.length > 0 ? draft.qualifications : ['']);
        setIsDraftLoaded(true);
        toast.info('Your saved draft has been loaded.');
      } else {
        setJobPostData({ companyName: '', jobPosition: '', jobType: 'Full-time', description: '', deadline: '', contactPhone: '', country: 'Tanzania', region: '', poBoxType: 'P.O.Box', poBoxNumber: '' });
        setQualifications(['']);
        setIsDraftLoaded(false);
      }
    }
    setCompanyLogo(null);
    setTeamImage(null);
    setPostJobStep(1);
  }, [editingJob]);

  const handleJobDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJobPostData(prev => {
      const newData = { ...prev, [name]: value };
      // Kama mtumiaji amebadilisha nchi, futa mkoa ili amlazimishe kuchagua upya
      if (name === 'country') {
        newData.region = '';
      }
      return newData;
    });
  };

  const filteredCountries = Object.keys(LOCATION_DATA)
    .sort()
    .filter(country => country.toLowerCase().includes(countrySearchQuery.toLowerCase()));

  const handleQualificationChange = (index: number, value: string) => {
    const newQualifications = [...qualifications];
    newQualifications[index] = value;
    setQualifications(newQualifications);
  };

  const handleAddQualification = () => {
    if (qualifications[qualifications.length - 1].trim() === '') {
      toast.info('Tafadhali jaza sifa ya sasa kabla ya kuongeza nyingine.');
      setActiveQualificationIndex(qualifications.length - 1);
      return;
    }
    const newQualifications = [...qualifications, ''];
    setQualifications(newQualifications);
    setActiveQualificationIndex(newQualifications.length - 1);
  };

  const handleRemoveQualification = (index: number) => {
    if (qualifications.length > 1) {
      const newQualifications = qualifications.filter((_, i) => i !== index);
      setQualifications(newQualifications);
      if (activeQualificationIndex >= index) {
        setActiveQualificationIndex(Math.max(0, activeQualificationIndex - 1));
      }
    } else {
      setQualifications(['']);
    }
  };

  const handleSaveDraft = () => {
    const draftData = {
      ...jobPostData,
      qualifications,
    };
    localStorage.setItem('job_post_draft', JSON.stringify(draftData));
    toast.info('Draft saved successfully!');
  };

  const handleDiscardDraft = () => {
    if (window.confirm('Are you sure you want to discard the current draft?')) {
      setJobPostData({ companyName: '', jobPosition: '', jobType: 'Full-time', description: '', deadline: '', contactPhone: '', country: 'Tanzania', region: '', poBoxType: 'P.O.Box', poBoxNumber: '' });
      setQualifications(['']);
      setCompanyLogo(null);
      setTeamImage(null);
      localStorage.removeItem('job_post_draft');
      toast.info('Draft discarded.');
      setIsDraftLoaded(false);
    }
  };

  const handlePostJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPostingJob) return;
    setIsPostingJob(true);
    
    let logoUrl = editingJob?.logoUrl || '';
    let teamImageUrl = editingJob?.teamImageUrl || '';

    try {
      if (companyLogo) {
        const storageRef = ref(firebaseStorage, `company_logos/${Date.now()}_${companyLogo.name}`);
        await uploadBytes(storageRef, companyLogo);
        logoUrl = await getDownloadURL(storageRef);
      }
      
      const poBoxStr = `${jobPostData.poBoxType} ${jobPostData.poBoxNumber}`;
      const finalAddress = [poBoxStr, jobPostData.region, jobPostData.country].filter(Boolean).join(', ');

      if (teamImage) {
        const teamStorageRef = ref(firebaseStorage, `team_images/${Date.now()}_${teamImage.name}`);
        await uploadBytes(teamStorageRef, teamImage);
        teamImageUrl = await getDownloadURL(teamStorageRef);
      }

      const jobDataToSave = {
        ...jobPostData,
        qualifications: qualifications.filter(q => q.trim() !== ''),
        logoUrl: logoUrl,
        teamImageUrl: teamImageUrl,
        contactPhone: `${COUNTRY_DIAL_CODES[jobPostData.country]?.split(' ')[1] || ''} ${jobPostData.contactPhone}`.trim(),
        companyAddress: finalAddress,
      };

      // Prevent saving UI-only fields to the database directly
      delete (jobDataToSave as Record<string, unknown>).country;
      delete (jobDataToSave as Record<string, unknown>).region;
      delete (jobDataToSave as Record<string, unknown>).poBoxType;
      delete (jobDataToSave as Record<string, unknown>).poBoxNumber;

      if (editingJob) {
        await updateDoc(doc(db, 'posted_jobs', editingJob.id), jobDataToSave);
        toast.success('Job updated successfully!');
      } else {
        if (!user) {
          toast.error('You must be logged in to post a job.');
          setIsPostingJob(false);
          return;
        }
        await addDoc(collection(db, 'posted_jobs'), {
          ...jobDataToSave,
          createdAt: new Date().toISOString(),
          createdBy: user.id,
        });
        toast.success('Job posted successfully! It is now visible to job seekers.');
      }
      localStorage.removeItem('job_post_draft');
      setActiveView('business_posted_jobs');
      setEditingJob(null);
    } catch (error) {
      console.error("Error saving job to Firestore: ", error);
      toast.error('Failed to save job. Please try again.');
    } finally {
      setIsPostingJob(false);
    }
  };

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <div className="flex items-center gap-4">
        <button onClick={() => { setActiveView('business_posted_jobs'); setEditingJob(null); }} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 transition-colors">
          &larr; Back to Jobs
        </button>
        <h1 className="text-4xl font-extrabold">{editingJob ? 'Edit Job Post' : 'Post a New Job'}</h1>
        {isDraftLoaded && !editingJob && (
          <button type="button" onClick={handleDiscardDraft} className="ml-auto rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            Discard Draft
          </button>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-700 bg-dark-1 p-8 shadow-lg">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="relative h-2 rounded-full bg-gray-700">
            <div 
              className="absolute top-0 left-0 h-2 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(postJobStep / 3) * 100}%` }}
            ></div>
          </div>
          <p className="text-right text-sm text-gray-400 mt-2">Step {postJobStep} of 3</p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handlePostJob}>
          {postJobStep === 1 && (
            <>
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2">Step 1 of 3: Company & Role</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Company Logo {editingJob?.logoUrl && '(Leave blank to keep current)'}</label>
                <input type="file" name="companyLogo" accept="image/*" onChange={(e) => setCompanyLogo(e.target.files ? e.target.files[0] : null)} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Picha ya Timu/Mandhari {editingJob?.teamImageUrl && '(Acha wazi kubakiza ya sasa)'}</label>
                <input type="file" name="teamImage" accept="image/*" onChange={(e) => setTeamImage(e.target.files ? e.target.files[0] : null)} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Company Name</label>
                <input type="text" name="companyName" value={jobPostData.companyName} onChange={handleJobDataChange} placeholder="Enter company name" className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Job Position</label>
                <input type="text" name="jobPosition" value={jobPostData.jobPosition} onChange={handleJobDataChange} placeholder="e.g. Senior Software Engineer" className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Namba ya Simu (Mawasiliano Zaidi)</label>
                <div className="flex gap-2">
                   <div className="w-32 rounded-lg bg-gray-800 px-3 py-3 text-white border border-gray-700 flex items-center justify-center font-bold whitespace-nowrap overflow-hidden">
                      {COUNTRY_DIAL_CODES[jobPostData.country] || '🏳️ +000'}
                   </div>
                   <input type="tel" name="contactPhone" value={jobPostData.contactPhone} onChange={handleJobDataChange} pattern="^\d{8,12}$" title="Namba lazima iwe kati ya tarakimu 8 na 12 (bila kodi ya nchi)" placeholder="Mfano: 700000000" className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Anuani ya Kampuni / Makao Makuu</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                <div className="relative" ref={countryDropdownRef}>
                  <input 
                    type="text" 
                    placeholder="Tafuta au chagua nchi..." 
                    value={isCountryDropdownOpen ? countrySearchQuery : jobPostData.country}
                    onFocus={() => { setIsCountryDropdownOpen(true); setCountrySearchQuery(''); }}
                    onChange={(e) => { setCountrySearchQuery(e.target.value); setIsCountryDropdownOpen(true); }}
                    className="w-full rounded-lg bg-gray-800 px-4 py-3 pr-10 text-white border border-gray-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={20} />
                  </div>
                  {isCountryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-2xl">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map(country => (
                          <div key={country} onClick={() => { setJobPostData(prev => ({ ...prev, country, region: '' })); setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }} className="px-4 py-3 text-white hover:bg-blue-600 cursor-pointer transition-colors border-b border-gray-700/50 last:border-0">
                            {country}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-400 italic">Hakuna nchi iliyopatikana</div>
                      )}
                    </div>
                  )}
                </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <select name="region" value={jobPostData.region} onChange={handleJobDataChange} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required>
                      <option value="" disabled>Chagua Mkoa / Jimbo</option>
                      {(LOCATION_DATA[jobPostData.country] || []).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-blue-400/80 italic px-1">* Mikoa inabadilika kulingana na nchi uliyochagua</p>
                  </div>
                  <div>
                    <div className="flex gap-2">
                       <select name="poBoxType" value={jobPostData.poBoxType} onChange={handleJobDataChange} className="w-1/3 rounded-lg bg-gray-800 px-2 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required>
                          <option value="P.O.Box">P.O.Box</option>
                          <option value="S.L.P">S.L.P</option>
                       </select>
                       <input type="text" name="poBoxNumber" value={jobPostData.poBoxNumber} onChange={handleJobDataChange} pattern="^[0-9]{3,6}$" title="Sanduku la posta lazima liwe namba halali ya tarakimu 3 hadi 6" placeholder="Namba (Mf: 1234)" className="w-2/3 rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button type="button" onClick={handleSaveDraft} className="rounded-lg bg-gray-700 px-5 py-2 font-semibold text-white hover:bg-gray-600 transition-colors">Save Draft</button>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setPostJobStep(2)} disabled={!jobPostData.companyName || !jobPostData.jobPosition || !jobPostData.contactPhone || !jobPostData.country || !jobPostData.region || !jobPostData.poBoxNumber} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            </>
          )}
          {postJobStep === 2 && (
            <>
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2">Step 2 of 3: Job Details</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Job Type</label>
                <select name="jobType" value={jobPostData.jobType} onChange={handleJobDataChange} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                  <option>Temporary</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Brief Description</label>
                <textarea rows={3} name="description" value={jobPostData.description} onChange={handleJobDataChange} placeholder="Describe the job role..." className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button type="button" onClick={handleSaveDraft} className="rounded-lg bg-gray-700 px-5 py-2 font-semibold text-white hover:bg-gray-600 transition-colors">Save Draft</button>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setPostJobStep(1)} className="rounded-lg bg-gray-700 px-5 py-2 font-semibold text-white hover:bg-gray-600 transition-colors">Back</button>
                  <button type="button" onClick={() => setPostJobStep(3)} disabled={!jobPostData.description} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            </>
          )}
          {postJobStep === 3 && (
            <>
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2">Step 3 of 3: Requirements & Deadline</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Qualifications</label>
                
                <div className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={qualifications[activeQualificationIndex] || ''}
                      onChange={(e) => handleQualificationChange(activeQualificationIndex, e.target.value)}
                      placeholder={`Enter qualification ${activeQualificationIndex + 1}`}
                      className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQualification(activeQualificationIndex)}
                      className="rounded-full bg-red-800 p-2 text-white hover:bg-red-700 flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setActiveQualificationIndex(activeQualificationIndex - 1)} disabled={activeQualificationIndex === 0} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-400">
                      {activeQualificationIndex + 1} / {qualifications.length}
                    </span>
                    <button type="button" onClick={() => setActiveQualificationIndex(activeQualificationIndex + 1)} disabled={activeQualificationIndex === qualifications.length - 1} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <button type="button" onClick={handleAddQualification} className="self-start rounded-lg bg-blue-600/80 px-4 py-2 text-sm font-semibold hover:bg-blue-600 transition-colors">
                    + Add Another
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Deadline (Date & Time)</label>
                <input type="datetime-local" name="deadline" value={jobPostData.deadline} onChange={handleJobDataChange} className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none" required />
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button type="button" onClick={handleSaveDraft} className="rounded-lg bg-gray-700 px-5 py-2 font-semibold text-white hover:bg-gray-600 transition-colors">Save Draft</button>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setPostJobStep(2)} className="rounded-lg bg-gray-700 px-5 py-2 font-semibold text-white hover:bg-gray-600 transition-colors">Back</button>
                  <button type="submit" disabled={isPostingJob || !jobPostData.deadline || qualifications.every(q => q.trim() === '')} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPostingJob ? 'Saving...' : (editingJob ? 'Save Changes' : 'Post Job')}
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default PostJobForm;