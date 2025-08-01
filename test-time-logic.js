// Updated test to verify the 10-hour cutoff logic with proper timezone handling
const now = new Date();
console.log('Current UTC time:', now.toISOString());

// Get Malaysia time using proper timezone formatting
const formatter = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

const parts = formatter.formatToParts(now);
const malaysiaTimeString = `${parts[4].value}-${parts[0].value}-${parts[2].value}T${parts[6].value}:${parts[8].value}:00`;
const malaysiaTime = new Date(malaysiaTimeString);

console.log('Current Malaysia time:', malaysiaTime.getHours() + ':' + malaysiaTime.getMinutes().toString().padStart(2, '0'));

// Test for tomorrow 8:00 AM
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// Create departure time for tomorrow 8:00 AM
const [year, month, day] = tomorrowStr.split('-').map(Number);
const departureTime = new Date(year, month - 1, day, 8, 0); // 8:00 AM
console.log('Departure time (tomorrow 8:00 AM):', departureTime.getHours() + ':' + departureTime.getMinutes().toString().padStart(2, '0'));

// Calculate 10 hours before departure (should be 10:00 PM today)
const cutoffTime = new Date(departureTime.getTime() - (10 * 60 * 60 * 1000));
console.log('Cutoff time (10 hours before):', cutoffTime.getHours() + ':' + cutoffTime.getMinutes().toString().padStart(2, '0'));

// Check if booking is allowed
const isAllowed = malaysiaTime.getTime() < cutoffTime.getTime();
console.log('Is booking allowed?', isAllowed);

console.log('\n=== Expected Result ===');
console.log('If current time is 9:20 PM, cutoff should be 10:00 PM, so booking should be ALLOWED');
console.log('If current time is 10:30 PM, cutoff should be 10:00 PM, so booking should be DENIED');
