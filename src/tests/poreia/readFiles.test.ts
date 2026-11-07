import { describe, expect, it } from 'vitest';
import { emailText, fitsBooking, readBookingFile } from '../../poreia/app/readFiles';

const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:abc@airline',
  'DTSTART:20270310T100000Z',
  'DTEND:20270310T170000Z',
  'SUMMARY:Flight TP 210 New York JFK to Lisbon',
  'LOCATION:JFK Terminal 1',
  'DESCRIPTION:Booking reference: ABC123\\nThank you for flying with us',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('bookings from files', () => {
  it('takes the files a confirmation comes as', () => {
    expect(fitsBooking(new File(['x'], 'trip.ics', { type: 'text/calendar' }))).toBe(true);
    expect(fitsBooking(new File(['x'], 'pass.png', { type: 'image/png' }))).toBe(true);
    expect(fitsBooking(new File(['x'], 'mail.eml', { type: '' }))).toBe(true);
    expect(fitsBooking(new File(['x'], 'song.mp3', { type: 'audio/mpeg' }))).toBe(false);
  });

  it('reads a calendar invite: title, times, place and the confirmation in its notes', async () => {
    const { booking } = await readBookingFile(new File([ics], 'invite.ics', { type: 'text/calendar' }));
    expect(booking).toMatchObject({ kind: 'flight', title: 'Flight TP 210 New York JFK to Lisbon', startDate: '2027-03-10', address: 'JFK Terminal 1', confirmation: 'ABC123' });
    expect(booking?.startTime).toMatch(/^\d\d:\d\d$/);
  });

  it('undoes an email’s line wrapping and reads its page', async () => {
    expect(emailText('Confirm=\nation =C3=A9')).toBe('Confirmation Ã©');
    const page = '<html><body><script type="application/ld+json">{"@type":"LodgingReservation","reservationNumber":"HMX4QZ2","reservationFor":{"@type":"LodgingBusiness","name":"Casa Azul"},"checkinTime":"2099-11-10T15:00:00","checkoutTime":"2099-11-13T11:00:00"}</script><p>Your stay</p></body></html>';
    const { booking } = await readBookingFile(new File([page], 'Booking.html', { type: 'text/html' }));
    expect(booking).toMatchObject({ kind: 'stay', title: 'Casa Azul', confirmation: 'HMX4QZ2', startDate: '2099-11-10' });
  });
});
