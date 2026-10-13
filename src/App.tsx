import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DoctorDetailPage } from './pages/DoctorDetailPage.tsx';
import { PatientDashboardPage } from './pages/PatientDashboardPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Doctor, Appointment } from './types/index.ts';

function MainLayout() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);

  const handleBookDoctor = (doctor: Doctor) => {
    setBookingDoctor(doctor);
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setCurrentView('doctor-detail');
  };

  const handleBookingSuccess = (_appointment: Appointment) => {
    // Keep booking modal open on confirmation view
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] flex flex-col font-sans text-emerald-950 selection:bg-emerald-200 selection:text-emerald-950">
      
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'admin-dashboard' && user?.role !== 'admin') {
            setAuthModalMode('login');
            return;
          }
          if (view === 'patient-dashboard' && !user) {
            setAuthModalMode('login');
            return;
          }
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === 'home' && (
          <HomePage
            onBookDoctor={handleBookDoctor}
            onSelectDoctor={handleSelectDoctor}
          />
        )}

        {currentView === 'doctor-detail' && selectedDoctor && (
          <DoctorDetailPage
            doctorId={selectedDoctor.id}
            onBack={() => setCurrentView('home')}
            onBook={handleBookDoctor}
          />
        )}

        {currentView === 'patient-dashboard' && (
          <PatientDashboardPage
            onFindDoctors={() => setCurrentView('home')}
          />
        )}

        {currentView === 'admin-dashboard' && user?.role === 'admin' && (
          <AdminDashboardPage />
        )}
      </main>

      {/* Booking Modal */}
      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onBookingSuccess={handleBookingSuccess}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
          }}
        />
      )}

      {/* Auth Modal */}
      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={() => {
            // Success
          }}
        />
      )}

      {/* Authentic Clinical Network Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
