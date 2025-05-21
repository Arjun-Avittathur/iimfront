// src/services/availabilityService.js

const BOOKINGS_STORAGE_KEY = 'hotel_bookings';

// Get all bookings from local storage
export const getBookings = () => {
  const bookingsJson = localStorage.getItem(BOOKINGS_STORAGE_KEY);
  if (!bookingsJson) return [];
  try {
    return JSON.parse(bookingsJson).map(booking => ({
      ...booking,
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate)
    }));
  } catch (error) {
    console.error('Error parsing bookings from localStorage:', error);
    return [];
  }
};

// Internal helper to calculate availability for a given set of bookings
const calculateAvailabilityInternal = (startDateTime, endDateTime, numberOfRooms, existingBookingsList) => {
  const dateBookingMap = {}; // Keyed by "YYYY-MM-DD" ISO string

  const checkInDateTime = new Date(startDateTime);
  const checkOutDateTime = new Date(endDateTime);

  const localCheckInDate = new Date(checkInDateTime.getFullYear(), checkInDateTime.getMonth(), checkInDateTime.getDate());
  const localCheckOutDate = new Date(checkOutDateTime.getFullYear(), checkOutDateTime.getMonth(), checkOutDateTime.getDate());

  let currentIterDate = new Date(localCheckInDate);
  while (currentIterDate <= localCheckOutDate) {
    const isoDateKey = `${currentIterDate.getFullYear()}-${String(currentIterDate.getMonth() + 1).padStart(2, '0')}-${String(currentIterDate.getDate()).padStart(2, '0')}`;
    dateBookingMap[isoDateKey] = 0;
    currentIterDate.setDate(currentIterDate.getDate() + 1);
  }

  existingBookingsList.forEach(booking => {
    const bookingStartDateTime = new Date(booking.startDate);
    const bookingEndDateTime = new Date(booking.endDate);

    if (bookingEndDateTime <= checkInDateTime || bookingStartDateTime >= checkOutDateTime) return;

    const bookingEffectStartDay = new Date(Math.max(bookingStartDateTime.getTime(), localCheckInDate.getTime()));
    bookingEffectStartDay.setHours(0, 0, 0, 0);

    let bookingEffectEndDay = new Date(Math.min(bookingEndDateTime.getTime(), 
        new Date(localCheckOutDate.getFullYear(), localCheckOutDate.getMonth(), localCheckOutDate.getDate(), 23, 59, 59, 999).getTime()
    ));
    bookingEffectEndDay.setHours(0, 0, 0, 0);

    let iterOverlapDate = new Date(bookingEffectStartDay);
    while (iterOverlapDate <= bookingEffectEndDay) {
      if (iterOverlapDate >= localCheckInDate && iterOverlapDate <= localCheckOutDate) {
        const isoDateKey = `${iterOverlapDate.getFullYear()}-${String(iterOverlapDate.getMonth() + 1).padStart(2, '0')}-${String(iterOverlapDate.getDate()).padStart(2, '0')}`;
        if (isoDateKey in dateBookingMap) dateBookingMap[isoDateKey] += booking.numberOfRooms;
      }
      iterOverlapDate.setDate(iterOverlapDate.getDate() + 1);
    }
  });

  const totalRooms = 133;
  let minAvailableRooms = totalRooms;
  const isoDailyAvailability = {};
  Object.entries(dateBookingMap).forEach(([isoDateKey, bookedRooms]) => {
    const availableRooms = totalRooms - bookedRooms;
    isoDailyAvailability[isoDateKey] = availableRooms;
    minAvailableRooms = Math.min(minAvailableRooms, availableRooms);
  });

  const dailyAvailabilityForDisplay = {};
  Object.keys(isoDailyAvailability).sort().forEach(isoKey => {
    const [year, month, day] = isoKey.split('-').map(Number);
    const displayDate = new Date(year, month - 1, day);
    dailyAvailabilityForDisplay[displayDate.toLocaleDateString()] = isoDailyAvailability[isoKey];
  });

  return {
    available: minAvailableRooms >= numberOfRooms,
    availableRooms: minAvailableRooms,
    requestedRooms: numberOfRooms,
    dailyAvailability: dailyAvailabilityForDisplay,
    startDate: checkInDateTime,
    endDate: checkOutDateTime,
    checkInTime: checkInDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    checkOutTime: checkOutDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
  };
};

// Public API to check room availability
export const checkRoomAvailability = (startDateTime, endDateTime, numberOfRooms) => {
  const currentBookings = getBookings();
  return calculateAvailabilityInternal(startDateTime, endDateTime, numberOfRooms, currentBookings);
};

// Public API to check room availability excluding specific bookings (used for updates)
export const checkRoomAvailabilityWithoutBookings = (startDateTime, endDateTime, numberOfRooms, excludeBookingIds = []) => {
  const currentBookings = getBookings().filter(booking => !excludeBookingIds.includes(booking.id));
  return calculateAvailabilityInternal(startDateTime, endDateTime, numberOfRooms, currentBookings);
};

// Save a new booking with priority logic for confirmed over pencil bookings
export const saveBooking = (bookingData) => {
  const allCurrentBookings = getBookings();
  let bookingsForCheck = [...allCurrentBookings];
  let finalBookingsToPersist = [...allCurrentBookings];
  let pencilBookingsOverridden = false;

  if (bookingData.bookingStatus === 'confirmed') {
    const newConfirmedStart = new Date(bookingData.startDate);
    const newConfirmedEnd = new Date(bookingData.endDate);
    const idsOfPencilToOverride = new Set();

    allCurrentBookings.forEach(b => {
      if (b.bookingStatus === 'pencil') {
        const pencilStart = new Date(b.startDate);
        const pencilEnd = new Date(b.endDate);
        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        if (newConfirmedStart < pencilEnd && newConfirmedEnd > pencilStart) {
          idsOfPencilToOverride.add(b.id);
        }
      }
    });

    if (idsOfPencilToOverride.size > 0) {
      bookingsForCheck = allCurrentBookings.filter(b => !idsOfPencilToOverride.has(b.id));
      finalBookingsToPersist = [...bookingsForCheck]; // This will be used if availability check passes
      pencilBookingsOverridden = true;
      console.log(`Identified ${idsOfPencilToOverride.size} pencil booking(s) to be overridden by confirmed booking.`);
    }
  }

  // Check availability against the filtered list (pencil bookings removed if confirmed)
  const availabilityResult = calculateAvailabilityInternal(
    bookingData.startDate,
    bookingData.endDate,
    bookingData.numberOfRooms,
    bookingsForCheck
  );

  if (availabilityResult.available) {
    const newBooking = { ...bookingData, id: Date.now() };
    finalBookingsToPersist.push(newBooking); // Add the new booking to the filtered list
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(finalBookingsToPersist));
    if (pencilBookingsOverridden) {
      console.log(`Successfully overridden ${idsOfPencilToOverride.size} pencil booking(s) for this confirmed booking.`);
    }
    console.log("Booking successful. Final list of bookings saved.");
    return newBooking;
  } else {
    let failureMessage = `Booking failed: Only ${availabilityResult.availableRooms} rooms available for the requested period.`;
    if (pencilBookingsOverridden && bookingData.bookingStatus === 'confirmed') {
      failureMessage += ` (This is after attempting to override conflicting pencil bookings).`;
    }
    console.error(failureMessage);
    throw new Error(failureMessage);
  }
};

// Update an existing booking
export const updateBooking = (bookingId, updatedData) => {
  const bookings = getBookings();
  const index = bookings.findIndex(booking => booking.id === bookingId);
  if (index === -1) throw new Error('Booking not found');
  const updatedBooking = { ...bookings[index], ...updatedData };
  bookings[index] = updatedBooking;
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  return updatedBooking;
};

// Delete a booking
export const deleteBooking = (bookingId) => {
  const bookings = getBookings();
  const updatedBookings = bookings.filter(booking => booking.id !== bookingId);
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updatedBookings));
  return { success: true };
};

// Clear all bookings (for testing)
export const clearAllBookings = () => {
  localStorage.removeItem(BOOKINGS_STORAGE_KEY);
};
