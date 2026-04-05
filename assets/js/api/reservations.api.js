// READY FOR SUPABASE

export async function getReservations() {
  // return supabase.from('reservations').select('*');
}

export async function createReservation(data) {
  // insert reservation
}

export async function assignDriver(reservationId, driverId) {
  // update driver assignment
}

export async function getTimeSlots(date) {
  // return available/booked slots
}