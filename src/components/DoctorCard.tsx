import React from 'react';
import { Doctor } from '../types/index.ts';
import { MapPin, Calendar, Clock, Languages, Award, CheckCircle2 } from 'lucide-react';

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
  onSelect: (doctor: Doctor) => void;
}

// Map doctor specialities to spoken languages common in Indian metro OPDs
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

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook, onSelect }) => {
  const languages = getSpokenLanguages(doctor.specialty);

  return (
    <article className="bg-white rounded-2xl border border-[#E8E4DA] shadow-xs hover:border-emerald-800/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div className="p-5 space-y-4">
        
        {/* Physician Header */}
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-100/80 shrink-0">
            <img
              src={doctor.avatar_url || '/src/assets/images/dr_ananya_sharma_1791877160992.jpg'}
              alt={doctor.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
              <span>{doctor.specialty}</span>
              <span aria-hidden="true" className="text-emerald-300">·</span>
              <span className="text-emerald-700/80">{doctor.experience_years} yrs clinical exp</span>
            </div>

            <h3 
              onClick={() => onSelect(doctor)}
              className="text-base font-bold text-emerald-950 font-serif tracking-tight hover:text-emerald-800 cursor-pointer transition-colors mt-0.5 truncate"
            >
              {doctor.name}
            </h3>

            <div className="flex items-center gap-1 text-xs text-emerald-900/60 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{doctor.location || 'CareFlow Outpatient Pavilion'}</span>
            </div>
          </div>
        </div>

        {/* Clinical Bio */}
        {doctor.bio && (
          <p className="text-xs text-emerald-950/70 line-clamp-2 leading-relaxed">
            {doctor.bio}
          </p>
        )}

        {/* Languages & OPD Availability Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1 text-emerald-800/80 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
            <Languages className="w-3 h-3 text-emerald-600" />
            <span>{languages.join(', ')}</span>
          </div>

          <div className="flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 font-medium">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Morning & Evening OPD</span>
          </div>
        </div>

        {/* Consultation Fee in INR (₹) */}
        <div className="pt-3 border-t border-[#F0ECE1] flex items-baseline justify-between text-xs">
          <div>
            <span className="text-[10px] text-emerald-900/50 font-medium uppercase tracking-wide block">OPD Consultation Fee</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-950 tabular-nums font-mono">
                ₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-800/60">/ in-clinic visit</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-emerald-900/50 font-medium uppercase tracking-wide block">Payment</span>
            <span className="text-xs font-semibold text-emerald-800">
              UPI / Cash at OPD Desk
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3.5 bg-[#F9F8F4] border-t border-[#ECE8DE] flex items-center justify-between gap-3">
        <button
          onClick={() => onSelect(doctor)}
          className="text-xs font-semibold text-emerald-900/80 hover:text-emerald-950 transition-colors py-1"
        >
          View Clinical Profile
        </button>

        <button
          onClick={() => onBook(doctor)}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          Select OPD Slot
        </button>
      </div>
    </article>
  );
};
