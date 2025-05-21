import React, { useState, useEffect } from 'react';
import { checkRoomAvailability } from '../services/availabilityService';

const AvailabilitySummary = ({ refreshTrigger }) => {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState(todayString);
  const [summaryData, setSummaryData] = useState({
    totalRooms: 133,
    bookedForDay: 0,
    availableForDay: 133,
    dateChecked: today.toLocaleDateString()
  });

  useEffect(() => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    const result = checkRoomAvailability(dayStart, dayEnd, 1);
    const localDateKey = dateObj.toLocaleDateString();
    const availableRoomsToday = result.dailyAvailability[localDateKey] !== undefined 
      ? result.dailyAvailability[localDateKey] 
      : result.availableRooms;

    setSummaryData({
      totalRooms: 133,
      bookedForDay: 133 - availableRoomsToday, 
      availableForDay: availableRoomsToday,
      dateChecked: localDateKey
    });
  }, [selectedDate, refreshTrigger]);

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const availabilityPercentage = summaryData.totalRooms > 0 ? (summaryData.availableForDay / summaryData.totalRooms) * 100 : 0;
  
  return (
    <div className="card summary-card">
      <h2 className="summary-title">Daily Room Availability</h2>
      <div className="form-group">
        <label htmlFor="summary-date-picker" className="form-label">Select Date:</label>
        <input 
          type="date" 
          id="summary-date-picker"
          className="form-input"
          value={selectedDate}
          onChange={handleDateChange}
        />
      </div>
      <div className="date-range-display" style={{ marginTop: '15px' }}>
        <p>
          <span className="date-info-label">Showing for: </span>
          <span className="date-info-value">{summaryData.dateChecked}</span>
        </p>
      </div>
      <div className="summary-grid">
        <div className="summary-item summary-item-blue">
          <p className="summary-label">Total Rooms</p>
          <p className="summary-value">{summaryData.totalRooms}</p>
        </div>
        <div className="summary-item summary-item-red">
          <p className="summary-label">Booked on this Day</p>
          <p className="summary-value">{summaryData.bookedForDay}</p>
        </div>
        <div className="summary-item summary-item-green">
          <p className="summary-label">Available on this Day</p>
          <p className="summary-value">{summaryData.availableForDay}</p>
        </div>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-value"
          style={{ width: `${availabilityPercentage}%` }}
        ></div>
      </div>
      <p className="progress-text">
        {availabilityPercentage.toFixed(1)}% rooms available on {summaryData.dateChecked}
      </p>
    </div>
  );
};

export default AvailabilitySummary;
