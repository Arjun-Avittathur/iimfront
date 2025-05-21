// src/App.jsx
import React, { useState, useEffect } from 'react';
import BookingForm from './components/BookingForm';
import AvailabilitySummary from './components/AvailabilitySummary';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import AdminBookingManager from './components/AdminBookingManager';
import Toast from './components/Toast';
import './styles/main.css'; // Ensure your CSS is imported

function App() {
  const [toasts, setToasts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // selectedDates from calendar can still be used by BookingForm
  const today = new Date();
  const initialStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const initialEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 
  
  const [selectedDatesForForm, setSelectedDatesForForm] = useState({ 
    startDate: initialStartDate, 
    endDate: initialEndDate 
  });
  const [showAdmin, setShowAdmin] = useState(false);

  const addToast = (message, type) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 5000);
  };

  const handleBookingChanged = () => {
    setRefreshTrigger(prev => prev + 1); // This will trigger re-fetch in summary and calendar
  };
  
  const handleDateSelectFromCalendar = (dates) => {
    const newStartDate = new Date(dates.startDate.getFullYear(), dates.startDate.getMonth(), dates.startDate.getDate());
    let newEndDate = new Date(dates.endDate.getFullYear(), dates.endDate.getMonth(), dates.endDate.getDate());

    if (dates.action === 'click' && dates.slots && dates.slots.length === 1) {
      newEndDate = new Date(newStartDate); 
    } else if (newEndDate < newStartDate) { 
        newEndDate = new Date(newStartDate);
    }
    setSelectedDatesForForm({
        startDate: newStartDate,
        endDate: newEndDate
    });
  };
  
  const toggleAdminPanel = () => {
    setShowAdmin(prev => !prev);
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">Program Room Booking System</h1>
        <p className="app-subtitle">Book rooms for your programs with real-time availability checking</p>
        <button 
          onClick={toggleAdminPanel} 
          className="admin-toggle-btn"
        >
          {showAdmin ? "Hide Admin Panel" : "Show Admin Panel"}
        </button>
      </header>
      
      {showAdmin && (
        <div className="admin-section">
          <AdminBookingManager 
            addToast={addToast} 
            onBookingChanged={handleBookingChanged}
          />
        </div>
      )}
      
      <div className="grid grid-main">
        <div>
          <BookingForm 
            addToast={addToast} 
            onBookingAdded={handleBookingChanged}
            selectedDates={selectedDatesForForm} 
          />
        </div>
        
        <div>
          {/* AvailabilitySummary now manages its own date selection internally */}
          <AvailabilitySummary 
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
      
      <div className="calendar-section">
        <AvailabilityCalendar 
          refreshTrigger={refreshTrigger}
          onDateSelect={handleDateSelectFromCalendar} 
        />
      </div>
      
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
          />
        ))}
      </div>
    </div>
  );
}

export default App;
