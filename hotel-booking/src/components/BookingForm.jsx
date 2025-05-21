// src/components/BookingForm.jsx
import React, { useState, useEffect } from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { checkRoomAvailability, saveBooking } from '../services/availabilityService';

const BookingForm = ({ addToast, onBookingAdded, selectedDates }) => {
  // Form state
  const [formData, setFormData] = useState({
    programTitle: '',
    programType: '',
    numberOfRooms: 1,
    bookingStatus: 'pencil', // Default to pencil booking
    checkInTime: '14:00', // Default check-in time (2 PM)
    checkOutTime: '11:00', // Default check-out time (11 AM)
  });

  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Default to next day
    key: 'selection',
  });

  // Available program types
  const programTypes = [
    'Leadership Development Program',
    'Executive Training',
    'Team Building Workshop',
    'Corporate Retreat',
    'Conference',
    'Other'
  ];

  // Time options
  const timeOptions = generateTimeOptions();

  // Availability check result
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Update date range when selectedDates changes
  useEffect(() => {
    if (selectedDates && selectedDates.startDate && selectedDates.endDate) {
      setDateRange({
        startDate: selectedDates.startDate,
        endDate: selectedDates.endDate,
        key: 'selection'
      });
      
      // Auto-check availability when dates are selected from calendar
      checkAvailabilityForDates(
        selectedDates.startDate, 
        selectedDates.endDate, 
        formData.numberOfRooms,
        formData.checkInTime,
        formData.checkOutTime
      );
    }
  }, [selectedDates]);

  // Generate time options in 30-minute intervals
  function generateTimeOptions() {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of ['00', '30']) {
        const hourFormatted = hour.toString().padStart(2, '0');
        options.push(`${hourFormatted}:${minute}`);
      }
    }
    return options;
  }

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'numberOfRooms' ? parseInt(value) : value,
    });
  };

  // Handle date range selection
  const handleDateRangeChange = (ranges) => {
    setDateRange(ranges.selection);
  };

  // Calculate duration in days
  const calculateDuration = () => {
    if (!dateRange.startDate || !dateRange.endDate) return 0;
    const diffTime = Math.abs(dateRange.endDate - dateRange.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Create a datetime by combining date and time
  const combineDateAndTime = (date, timeString) => {
    const result = new Date(date);
    const [hours, minutes] = timeString.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  // Check availability for specific dates and times
  const checkAvailabilityForDates = async (startDate, endDate, rooms, checkInTime, checkOutTime) => {
    setIsChecking(true);
    setAvailabilityResult(null);

    try {
      // Combine dates and times
      const checkInDateTime = combineDateAndTime(startDate, checkInTime);
      const checkOutDateTime = combineDateAndTime(endDate, checkOutTime);
      
      // Use the availability service to check
      const result = checkRoomAvailability(
        checkInDateTime,
        checkOutDateTime,
        rooms
      );

      setAvailabilityResult(result);
      
      if (result.available) {
        addToast('Rooms are available for your selected dates and times!', 'success');
      } else {
        addToast(`Sorry, only ${result.availableRooms} rooms available for your selected period.`, 'error');
      }
    } catch (error) {
      addToast('Error checking availability. Please try again.', 'error');
      console.error('Error checking availability:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Check room availability
  const checkAvailability = async () => {
    if (!validateForm()) return;
    checkAvailabilityForDates(
      dateRange.startDate, 
      dateRange.endDate, 
      formData.numberOfRooms,
      formData.checkInTime,
      formData.checkOutTime
    );
  };

  // Book the rooms
  const bookRooms = async () => {
    if (!availabilityResult?.available) {
      addToast('Please check availability first.', 'error');
      return;
    }

    setIsBooking(true);

    try {
      // Combine dates and times
      const checkInDateTime = combineDateAndTime(dateRange.startDate, formData.checkInTime);
      const checkOutDateTime = combineDateAndTime(dateRange.endDate, formData.checkOutTime);
      
      // Save the booking
      const booking = saveBooking({
        ...formData,
        startDate: checkInDateTime,
        endDate: checkOutDateTime,
        createdAt: new Date()
      });

      addToast('Booking successful!', 'success');
      
      // Notify parent component about the new booking
      if (onBookingAdded) {
        onBookingAdded(booking);
      }
      
      // Reset form after successful booking
      resetForm();
    } catch (error) {
      addToast('Error making booking. Please try again.', 'error');
      console.error('Error making booking:', error);
    } finally {
      setIsBooking(false);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!formData.programTitle.trim()) {
      addToast('Program title is required', 'error');
      return false;
    }
    
    if (!formData.programType) {
      addToast('Please select a program type', 'error');
      return false;
    }
    
    if (formData.numberOfRooms < 1) {
      addToast('Number of rooms must be at least 1', 'error');
      return false;
    }
    
    if (formData.numberOfRooms > 133) {
      addToast('Number of rooms cannot exceed total capacity (133)', 'error');
      return false;
    }
    
    if (dateRange.startDate >= dateRange.endDate) {
      addToast('Check-out date must be after check-in date', 'error');
      return false;
    }
    
    // Check if check-in and check-out are on the same day but check-out time is before check-in time
    if (
      dateRange.startDate.toDateString() === dateRange.endDate.toDateString() &&
      formData.checkOutTime <= formData.checkInTime
    ) {
      addToast('Check-out time must be after check-in time on the same day', 'error');
      return false;
    }
    
    return true;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      programTitle: '',
      programType: '',
      numberOfRooms: 1,
      bookingStatus: 'pencil',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });
    
    setDateRange({
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      key: 'selection',
    });
    
    setAvailabilityResult(null);
  };

  return (
    <div className="card">
      <h2 className="summary-title">Program Room Booking</h2>
      
      <div className="two-column">
        <div>
          <div className="form-group">
            <label className="form-label">Program Title</label>
            <input
              type="text"
              name="programTitle"
              value={formData.programTitle}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter program title"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Program Type</label>
            <select
              name="programType"
              value={formData.programType}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="">Select Program Type</option>
              {programTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Number of Rooms</label>
            <input
              type="number"
              name="numberOfRooms"
              value={formData.numberOfRooms}
              onChange={handleInputChange}
              min="1"
              max="133"
              className="form-input"
            />
            <p className="form-hint">Total available: 133 rooms</p>
          </div>
          
          <div className="form-group">
            <label className="form-label">Booking Status</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="bookingStatus"
                  value="pencil"
                  checked={formData.bookingStatus === 'pencil'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                <span>Pencil Booking</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="bookingStatus"
                  value="confirmed"
                  checked={formData.bookingStatus === 'confirmed'}
                  onChange={handleInputChange}
                  className="radio-input"
                />
                <span>Confirmed Booking</span>
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <label className="form-label">Select Date Range</label>
          <div className="date-range-wrapper">
            <DateRangePicker
              ranges={[dateRange]}
              onChange={handleDateRangeChange}
              minDate={new Date()}
              rangeColors={["#4a6fa5"]}
            />
          </div>
          
          <div className="time-selection">
            <div className="form-group">
              <label className="form-label">Check-in Time</label>
              <select
                name="checkInTime"
                value={formData.checkInTime}
                onChange={handleInputChange}
                className="form-select"
              >
                {timeOptions.map(time => (
                  <option key={`checkin-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Check-out Time</label>
              <select
                name="checkOutTime"
                value={formData.checkOutTime}
                onChange={handleInputChange}
                className="form-select"
              >
                {timeOptions.map(time => (
                  <option key={`checkout-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="date-info">
            <p>
              <span className="date-info-label">Check-in:</span> {dateRange.startDate.toLocaleDateString()} at {formData.checkInTime}
            </p>
            <p>
              <span className="date-info-label">Check-out:</span> {dateRange.endDate.toLocaleDateString()} at {formData.checkOutTime}
            </p>
            <p>
              <span className="date-info-label">Duration:</span> {calculateDuration()} days
            </p>
          </div>
        </div>
      </div>
      
      <div className="button-group">
        <button
          onClick={checkAvailability}
          disabled={isChecking}
          className={`btn ${isChecking ? 'btn-disabled' : 'btn-primary'}`}
        >
          {isChecking ? (
            <>
              <div className="spinner"></div>
              Checking...
            </>
          ) : "Check Availability"}
        </button>
        
        <button
          onClick={bookRooms}
          disabled={!availabilityResult?.available || isBooking}
          className={`btn ${
            availabilityResult?.available && !isBooking
              ? 'btn-success' 
              : 'btn-disabled'
          }`}
        >
          {isBooking ? (
            <>
              <div className="spinner"></div>
              Booking...
            </>
          ) : "Book Now"}
        </button>
        
        <button
          onClick={resetForm}
          className="btn btn-secondary"
        >
          Reset
        </button>
      </div>
      
      {availabilityResult && (
        <div className={`result-card ${
          availabilityResult.available ? 'result-success' : 'result-error'
        }`}>
          <h3 className="result-title">
            {availabilityResult.available 
              ? 'Rooms Available!' 
              : 'Insufficient Rooms Available'}
          </h3>
          <p>
            {availabilityResult.available 
              ? `${availabilityResult.requestedRooms} rooms are available for your selected period.` 
              : `Only ${availabilityResult.availableRooms} rooms available out of ${availabilityResult.requestedRooms} requested.`}
          </p>
          <p>
            <span className="date-info-label">Check-in:</span> {availabilityResult.startDate.toLocaleDateString()} at {availabilityResult.startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
          <p>
            <span className="date-info-label">Check-out:</span> {availabilityResult.endDate.toLocaleDateString()} at {availabilityResult.endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
          
          {/* Show detailed daily availability */}
          {availabilityResult.dailyAvailability && (
            <div className="daily-availability">
              <h4 className="daily-title">Daily Availability:</h4>
              <div className="daily-grid">
                {Object.entries(availabilityResult.dailyAvailability).map(([date, available]) => (
                  <div key={date} className="daily-item">
                    <span className="daily-date">{new Date(date).toLocaleDateString()}</span>
                    <span className="daily-rooms">{available} rooms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingForm;
