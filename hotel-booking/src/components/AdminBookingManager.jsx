// src/components/AdminBookingManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  getBookings, 
  deleteBooking, 
  updateBooking, 
  checkRoomAvailabilityWithoutBookings 
} from '../services/availabilityService';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const AdminBookingManager = ({ addToast, onBookingChanged }) => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    programTitle: '',
    programType: '',
    numberOfRooms: 1,
    bookingStatus: 'pencil',
    checkInTime: '14:00',
    checkOutTime: '11:00',
  });
  
  // Date range for editing
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
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
  
  useEffect(() => {
    fetchBookings();
  }, []);
  
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
  
  const fetchBookings = () => {
    try {
      const storedBookings = getBookings();
      setBookings(storedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      addToast('Error loading bookings', 'error');
    }
  };
  
  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      await deleteBooking(bookingId);
      addToast('Booking deleted successfully', 'success');
      fetchBookings();
      if (onBookingChanged) {
        onBookingChanged();
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      addToast('Error deleting booking', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditClick = (booking) => {
    // Extract time from the date objects
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    
    const checkInTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const checkOutTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    setSelectedBooking(booking);
    setEditForm({
      programTitle: booking.programTitle,
      programType: booking.programType,
      numberOfRooms: booking.numberOfRooms,
      bookingStatus: booking.bookingStatus,
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
    });
    
    // Set date range without time component
    const dateOnlyStart = new Date(startDate);
    dateOnlyStart.setHours(0, 0, 0, 0);
    
    const dateOnlyEnd = new Date(endDate);
    dateOnlyEnd.setHours(0, 0, 0, 0);
    
    setDateRange({
      startDate: dateOnlyStart,
      endDate: dateOnlyEnd,
      key: 'selection',
    });
    
    setIsEditing(true);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm({
      ...editForm,
      [name]: name === 'numberOfRooms' ? parseInt(value) : value,
    });
  };
  
  const handleDateRangeChange = (ranges) => {
    setDateRange(ranges.selection);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedBooking(null);
  };
  
  const validateForm = () => {
    if (!editForm.programTitle.trim()) {
      addToast('Program title is required', 'error');
      return false;
    }
    
    if (!editForm.programType) {
      addToast('Please select a program type', 'error');
      return false;
    }
    
    if (editForm.numberOfRooms < 1) {
      addToast('Number of rooms must be at least 1', 'error');
      return false;
    }
    
    if (editForm.numberOfRooms > 133) {
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
      editForm.checkOutTime <= editForm.checkInTime
    ) {
      addToast('Check-out time must be after check-in time on the same day', 'error');
      return false;
    }
    
    return true;
  };
  
  // Create a datetime by combining date and time
  const combineDateAndTime = (date, timeString) => {
    const result = new Date(date);
    const [hours, minutes] = timeString.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };
  
  const handleSaveEdit = async () => {
    if (!selectedBooking) return;
    
    // Validate form
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Combine dates and times
      const checkInDateTime = combineDateAndTime(dateRange.startDate, editForm.checkInTime);
      const checkOutDateTime = combineDateAndTime(dateRange.endDate, editForm.checkOutTime);
      
      // Check availability first (excluding the current booking)
      const availabilityResult = checkRoomAvailabilityWithoutBookings(
        checkInDateTime,
        checkOutDateTime,
        editForm.numberOfRooms,
        [selectedBooking.id]
      );
      
      if (!availabilityResult.available) {
        addToast(`Only ${availabilityResult.availableRooms} rooms available for the selected dates and times`, 'error');
        setLoading(false);
        return;
      }
      
      // Update the booking
      await updateBooking(selectedBooking.id, {
        ...editForm,
        startDate: checkInDateTime,
        endDate: checkOutDateTime,
      });
      
      addToast('Booking updated successfully', 'success');
      fetchBookings();
      setIsEditing(false);
      setSelectedBooking(null);
      
      if (onBookingChanged) {
        onBookingChanged();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      addToast(`Error updating booking: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date and time for display
  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  return (
    <div className="card admin-card">
      <h2 className="summary-title">Admin Booking Manager</h2>
      
      {isEditing && selectedBooking ? (
        <div className="edit-booking-form">
          <h3 className="edit-title">Edit Booking</h3>
          
          <div className="two-column">
            <div>
              <div className="form-group">
                <label className="form-label">Program Title</label>
                <input
                  type="text"
                  name="programTitle"
                  value={editForm.programTitle}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter program title"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Program Type</label>
                <select
                  name="programType"
                  value={editForm.programType}
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
                  value={editForm.numberOfRooms}
                  onChange={handleInputChange}
                  min="1"
                  max="133"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Booking Status</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="bookingStatus"
                      value="pencil"
                      checked={editForm.bookingStatus === 'pencil'}
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
                      checked={editForm.bookingStatus === 'confirmed'}
                      onChange={handleInputChange}
                      className="radio-input"
                    />
                    <span>Confirmed Booking</span>
                  </label>
                </div>
              </div>
              
              <div className="time-selection">
                <div className="form-group">
                  <label className="form-label">Check-in Time</label>
                  <select
                    name="checkInTime"
                    value={editForm.checkInTime}
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
                    value={editForm.checkOutTime}
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
              
              <div className="date-info">
                <p>
                  <span className="date-info-label">Check-in:</span> {dateRange.startDate.toLocaleDateString()} at {editForm.checkInTime}
                </p>
                <p>
                  <span className="date-info-label">Check-out:</span> {dateRange.endDate.toLocaleDateString()} at {editForm.checkOutTime}
                </p>
              </div>
            </div>
          </div>
          
          <div className="button-group">
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className={`btn ${loading ? 'btn-disabled' : 'btn-success'}`}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : "Save Changes"}
            </button>
            
            <button
              onClick={handleCancelEdit}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.length === 0 ? (
            <p className="no-bookings">No bookings found</p>
          ) : (
            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Type</th>
                    <th>Rooms</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id} className={booking.bookingStatus === 'confirmed' ? 'confirmed-row' : 'pencil-row'}>
                      <td>{booking.programTitle}</td>
                      <td>{booking.programType}</td>
                      <td>{booking.numberOfRooms}</td>
                      <td>{formatDateTime(booking.startDate)}</td>
                      <td>{formatDateTime(booking.endDate)}</td>
                      <td>
                        <span className={`status-badge ${booking.bookingStatus}`}>
                          {booking.bookingStatus}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleEditClick(booking)}
                            className="btn-icon edit"
                            title="Edit booking"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="btn-icon delete"
                            title="Delete booking"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBookingManager;
