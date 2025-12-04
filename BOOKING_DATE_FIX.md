# Booking Date Timezone Fix

## Problem Description

Bookings were appearing with dates one day off from what customers selected. For example:

- Customer selects: **January 20, 2026**
- Booking appears as: **January 19, 2026** in admin panel and emails

## Root Cause

The issue was caused by improper timezone handling when parsing date strings:

1. Client sends date as string: `"2026-01-20"`
2. Server parsed it as: `new Date('2026-01-20T12:00:00.000Z')` (UTC noon)
3. MongoDB stores the date in UTC
4. When displaying in Malaysia timezone (UTC+8), timezone conversion could shift the displayed date
5. The date `2026-01-20T12:00:00Z` (UTC) is actually `2026-01-20 20:00` in Malaysia time
6. But when queried or filtered by date without proper timezone handling, it could appear as January 19

## Solution

Created a new utility function `parseDateAsMalaysiaTimezone()` that:

- Parses dates as Malaysia timezone (UTC+8) instead of UTC
- Stores dates at noon Malaysia time (4 AM UTC = 12 PM Malaysia)
- Prevents off-by-one day errors throughout the system

### Changes Made

1. **New Utility Function** (`server/src/services/timeSlot.service.ts`):

   ```typescript
   static parseDateAsMalaysiaTimezone(dateString: string): Date {
     const [year, month, day] = dateString.split('-').map(Number);
     const malaysiaDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0)); // 4 AM UTC = 12 PM Malaysia
     return malaysiaDate;
   }
   ```

2. **Updated Files**:

   - `server/src/controllers/booking.controller.ts` - Booking creation AND date filtering (lines 42-47, 166-182)
   - `server/src/services/cartBooking.service.ts` - Cart booking creation (2 locations)
   - `server/src/services/cart.service.ts` - Cart item date handling (3 locations)
   - `server/src/controllers/cart.controller.ts` - Cart API endpoints (2 locations)

3. **Fix Script** (`server/scripts/fix-jan20-booking.js`):
   - Script to fix the specific affected booking
   - **Booking ID:** 6930d0179f4399f06af01c4c (ending in 6AF01C4C)
   - **Customer:** Jarod Aidan Schoeman (jarodaidanschoeman@gmail.com)
   - **Status:** ✅ Fixed - Now correctly shows January 20, 2026

## Status Update - December 4, 2025

### ✅ Issue Resolved

The specific booking reported by the customer has been fixed:

- **Booking ID:** 6930d0179f4399f06af01c4c
- **Customer:** Jarod Aidan Schoeman (jarodaidanschoeman@gmail.com)
- **Corrected Date:** January 20, 2026
- **Status:** Booking now appears correctly in admin panel on January 20, 2026

### What Was Fixed

1. **Date Storage (9 locations total):**

   - Booking creation endpoint
   - Cart booking creation (2 locations)
   - Cart operations (3 locations)
   - Cart API endpoints (2 locations)
   - **Admin panel date filtering** (critical for visibility)

2. **The Admin Panel Issue:**

   - The booking wasn't visible because the admin panel was filtering using local timezone midnight
   - Fixed: Admin panel now uses `TimeSlotService.parseDateAsMalaysiaTimezone()` for filtering
   - This ensures bookings stored at 4 AM UTC match filter queries for the same date

3. **Permanent Prevention:**
   - All new bookings will use Malaysia timezone parsing
   - Date filtering in queries matches the storage format
   - No more off-by-one day errors

## How to Fix Existing Affected Bookings (If Any More Are Found)

### For a Specific Booking by Email:

Create a simple fix script or use MongoDB directly:

```javascript
// Example: Fix a specific booking by email
const booking = await Booking.findOne({
  "contactInfo.email": "customer@email.com",
});
booking.date = new Date(Date.UTC(2026, 0, 20, 4, 0, 0)); // Jan 20, 2026 noon Malaysia
await booking.save();
```

### Using the Generic Fix Script:

```bash
cd server
node scripts/fix-booking-date-issue.js --bookingId=LAST8CHARS --apply
```

Note: This script adds one day, so only use it for bookings that are actually one day off.

## How to Fix Existing Affected Bookings

### Step 1: Identify the Booking

```bash
cd server
node scripts/fix-booking-date-issue.js --bookingId=6AF01C4C
```

This will show you:

- Current stored date
- Proposed corrected date
- Customer information

### Step 2: Apply the Fix (Dry Run First)

The command above runs in dry-run mode. Review the output carefully.

### Step 3: Apply the Actual Fix

```bash
node scripts/fix-booking-date-issue.js --bookingId=6AF01C4C --apply
```

## Testing the Fix

### Test Case 1: New Booking

1. Customer selects January 20, 2026 on the booking form
2. Complete the booking
3. Verify in admin panel that it shows January 20, 2026
4. Verify confirmation email shows January 20, 2026

### Test Case 2: Cart Booking

1. Add items to cart with specific dates
2. Complete cart checkout
3. Verify all bookings show correct dates

### Test Case 3: Timezone Edge Cases

Test with dates around month boundaries and year boundaries to ensure proper handling.

## Prevention

The fix is permanent because:

1. All date parsing now uses `parseDateAsMalaysiaTimezone()`
2. Dates are consistently stored at noon Malaysia time
3. Timezone conversions are handled correctly throughout the system

## Related Issues

- Previous fix: `server/scripts/fix-booking-dates.js` (older implementation)
- This fix supersedes the old one with a more robust solution

## Technical Details

### Why 4 AM UTC?

- Malaysia timezone is UTC+8
- We want dates stored at noon Malaysia time for consistency
- Noon Malaysia (12:00 PM) = 4:00 AM UTC
- This ensures dates display correctly regardless of server timezone

### Date Storage Format

- MongoDB stores: `2026-01-20T04:00:00.000Z`
- Displays as: January 20, 2026 12:00 PM (Malaysia)
- Email shows: Monday, January 20, 2026

## Verification Commands

Check a booking in MongoDB:

```javascript
db.bookings.findOne({ _id: ObjectId("...") });
```

The date field should show a time component of `T04:00:00.000Z` for dates parsed with the fix.

## Future Considerations

- All new date parsing should use `TimeSlotService.parseDateAsMalaysiaTimezone()`
- When adding new booking flows, ensure proper date handling
- Regular audits of booking dates to catch any anomalies early

## Contact

If bookings still appear with wrong dates after this fix, check:

1. Browser timezone settings
2. Server timezone configuration
3. MongoDB date storage format
4. Email template date formatting
