import React, { useState, useEffect } from 'react';
import { Doctor } from '../types/index.ts';
import { doctorApi } from '../services/api.ts';
import { ArrowLeft, MapPin, Calendar, Clock, Loader2, AlertCircle, ShieldCheck, Languages, Award, Building2 } from 'lucide-react';

interface DoctorDetailPageProps {
  doctorId: number;
  onBack: () => void;
  onBook: (doctor: Doctor) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getSpokenLanguages = (specialty: string): string[] => {
  switch (specialty) {
    case 'Cardiology': return ['English', 'Hindi', 'Kannada'];
    case 'Dermatology': return ['English', 'Hindi', 'Punjabi'];
    case 'Pediatrics': return ['English', 'Kannada', 'Hindi', 'Tamil'];
    case 'Orthopedics': return ['English', 'Tamil', 'Telugu'];
    case 'Neurology': return ['English', 'Hindi', 'Malayalam'];
    case 'General Medicine': return ['English', 'Kannada', 'Hindi', 'Marathi'];
    default: return ['English', 'Hindi'];
  }
};

export const DoctorDetailPage: React.FC<DoctorDetailPageProps> = ({ doctorId, onBack, onBook }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctor() {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorApi.get(doctorId);
        setDoctor(data.doctor);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve doctor profile');
      } finally {
        setLoading(false);
      }
    }
    loadDoctor();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-emerald-800/60 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-800" />
        <span className="text-xs font-semibold">Loading verified clinical profile...</span>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-8 text-center bg-white border border-[#E8E4DA] rounded-3xl space-y-3 max-w-lg mx-auto my-12">
        <AlertCircle className="w-6 h-6 text-emerald-800 mx-auto" />
        <h3 className="font-bold text-emerald-950 text-sm font-serif">Doctor Record Unavailable</h3>
        <p className="text-xs text-emerald-900/60">{error || 'Could not find requested record'}</p>
        <button
          onClick={onBack}
          className="py-1.5 px-4 bg-emerald-900 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const languages = getSpokenLanguages(doctor.specialty);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900/70 hover:text-emerald-950 transition cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Specialist Directory
      </button>

      {/* Main Profile Header */}
      <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start gap-6">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0">
          <img
            src={doctor.avatar_url || '/src/assets/images/dr_ananya_sharma_1791877160992.jpg'}
            alt={doctor.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="text-emerald-950 font-bold">{doctor.specialty}</span>
            <span aria-hidden="true" className="text-emerald-300">·</span>
            <span>{doctor.experience_years} Years Experience</span>
            <span aria-hidden="true" className="text-emerald-300">·</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              NMC Verified
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950 font-serif tracking-tight">
            {doctor.name}
          </h1>

          <div className="flex items-center gap-1.5 text-xs text-emerald-900/60">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{doctor.location || 'CareFlow Outpatient Pavilion'}</span>
          </div>

          {/* Languages spoken */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-800">
            <Languages className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Consultation in: {languages.join(', ')}</span>
          </div>

          <div className="pt-2 flex items-center gap-6 text-xs">
            <div>
              <span className="text-[10px] text-emerald-900/50 uppercase font-semibold block">OPD Consultation Fee</span>
              <span className="text-xl font-bold text-emerald-950 font-mono">
                ₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-900/50 uppercase font-semibold block">OPD Slot Duration</span>
              <span className="text-sm font-semibold text-emerald-900">
                30 Minutes Comprehensive
              </span>
            </div>
          </div>
        </div>

        <div className="sm:self-center w-full sm:w-auto">
          <button
            onClick={() => onBook(doctor)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Book OPD Slot
          </button>
        </div>
      </div>

      {/* Clinical Background and Schedule Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Biography */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-[#E8E4DA] p-6 space-y-4">
          <h2 className="text-sm font-bold text-emerald-950 font-serif uppercase tracking-wider">
            Clinical Focus & Medical Credentials
          </h2>
          <p className="text-xs sm:text-sm text-emerald-950/70 leading-relaxed">
            {doctor.bio || 'Senior medical consultant committed to evidence-based diagnosis, preventive healthcare, and compassionate clinical care.'}
          </p>
          
          <div className="pt-4 border-t border-[#F0ECE1] text-xs space-y-2">
            <span className="font-bold text-emerald-950 block">Hospital Outpatient Department Guidelines</span>
            <ul className="space-y-1.5 list-disc pl-4 text-emerald-900/70">
              <li>Please bring prior medical records, prescription slips, or scan reports.</li>
              <li>Report at the OPD nursing station 15 minutes before your scheduled slot.</li>
              <li>Same-day cancellations release the slot token immediately for other patients.</li>
            </ul>
          </div>
        </div>

        {/* Weekly OPD Timings */}
        <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 space-y-3">
          <h2 className="text-sm font-bold text-emerald-950 font-serif uppercase tracking-wider">
            OPD Roster & Timings
          </h2>
          <div className="divide-y divide-[#F0ECE1] text-xs">
            {doctor.schedules && doctor.schedules.length > 0 ? (
              doctor.schedules.slice(0, 6).map((sched) => (
                <div key={sched.id} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-emerald-950">{DAYS_OF_WEEK[sched.day_of_week]}</span>
                  <span className="font-mono text-emerald-900 font-semibold tabular-nums">
                    {sched.start_time.slice(0, 5)} – {sched.end_time.slice(0, 5)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-emerald-900/60 py-3">Monday – Saturday (09:00 – 13:00 & 16:30 – 19:30)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
