// src/components/AvailabilityCalendar.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getBookings } from '../services/availabilityService';

const localizer = momentLocalizer(moment);

const AvailabilityCalendar = ({ refreshTrigger, onDateSelect }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchBookings();
  }, [refreshTrigger]);

  const fetchBookings = () => {
    setLoading(true);
    
    try {
      // Get bookings from storage
      const storedBookings = getBookings();
      
      // Transform the data for the calendar
      const calendarEvents = storedBookings.map(booking => ({
        id: booking.id,
        title: `${booking.programTitle} (${booking.numberOfRooms} rooms)`,
        start: new Date(booking.startDate),
        end: new Date(booking.endDate),
        resource: booking
      }));
      
      setBookings(calendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    const isConfirmed = event.resource.bookingStatus === 'confirmed';
    
    return {
      style: {
        backgroundColor: isConfirmed ? '#4a6fa5' : '#9bbae7',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0',
        display: 'block'
      }
    };
  };
  
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };
  
  const handleViewChange = (newView) => {
    setView(newView);
  };
  
  const handleSelectSlot = ({ start, end }) => {
    // When user selects a date range on calendar
    if (onDateSelect) {
      // Adjust end date to be inclusive (end of day)
      const adjustedEnd = new Date(end);
      adjustedEnd.setDate(adjustedEnd.getDate() - 1);
      
      onDateSelect({
        startDate: start,
        endDate: adjustedEnd
      });
    }
  };

  return (
    <div className="card calendar-card">
      <h2 className="summary-title">Room Availability Calendar</h2>
      <p className="calendar-instructions">Click and drag to select dates for availability check</p>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: '#4a6fa5' }}></div>
        </div>
      ) : (
        <Calendar
          localizer={localizer}
          events={bookings}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          view={view}
          onView={handleViewChange}
          date={date}
          onNavigate={handleNavigate}
          selectable
          onSelectSlot={handleSelectSlot}
          tooltipAccessor={(event) => `${event.title}\nCheck-in: ${moment(event.start).format('MMM DD')}\nCheck-out: ${moment(event.end).format('MMM DD')}\nStatus: ${event.resource.bookingStatus}`}
          popup
        />
      )}
    </div>
  );
};

export default AvailabilityCalendar;
