# Booking Date Issue Fix - December 13, 2025

## Problem

Booking #70E4B5E8 (Clara Beneitez, 2 adults, Cameron to Taman Negara transfer) was not showing in the admin booking details page even though it was showing correctly in the booking count.

## Root Cause

The booking was created through the direct payment flow (not cart) with date stored as `2025-12-13T00:00:00.000Z` (midnight UTC) instead of `2025-12-13T04:00:00.000Z` (4 AM UTC = noon Malaysia).

When the admin queries for bookings on Dec 13, 2025, the booking controller uses `parseDateAsMalaysiaTimezone()` which creates a date range:

- Start: `2025-12-13T04:00:00.000Z` (noon Malaysia)
- End: `2025-12-14T04:00:00.000Z` (next day noon Malaysia)

Since the booking was at `2025-12-13T00:00:00.000Z` (BEFORE the start of the range), it didn't match the query.

### Why This Happened

In `server/src/controllers/payment.controller.ts`, the `confirmPayment()` method creates bookings after successful payment. When creating a new booking (line 492), it was using the raw `bookingData.date` from the client WITHOUT parsing it through `parseDateAsMalaysiaTimezone()`.

The cart booking flow correctly parses dates, but the direct booking flow did not.

## Fix Applied

### 1. Code Fix (Prevents Future Issues)

**File:** `server/src/controllers/payment.controller.ts`

Added date parsing before creating new bookings:

```typescript
// Added import at top of file
import { parseDateAsMalaysiaTimezone } from "../utils/dateUtils";

// Modified booking creation (line ~492)
// CRITICAL: Parse date as Malaysia timezone to avoid off-by-one day errors
const parsedDate =
  typeof bookingData.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(bookingData.date)
    ? parseDateAsMalaysiaTimezone(bookingData.date)
    : new Date(bookingData.date);

const finalBookingData = {
  ...bookingData,
  date: parsedDate, // Use parsed date instead of raw date string
  paymentInfo: {
    /* ... */
  },
};
```

### 2. Data Fix (Corrects Existing Booking)

**Script:** `server/scripts/fix-booking-70e4b5e8.js`

Updated booking #70E4B5E8:

- **Before:** `2025-12-13T00:00:00.000Z` (displays as Dec 13 in Malaysia TZ but doesn't match query range)
- **After:** `2025-12-13T04:00:00.000Z` (correctly represents Dec 13 noon Malaysia, matches query range)

## Verification

After fixes:

- ✅ Booking #70E4B5E8 now appears in admin booking details page
- ✅ Future bookings through direct payment flow will have correct dates
- ✅ Cart bookings already had correct date parsing (unchanged)

## Date Storage Standard

All bookings MUST store dates as:

- **Format:** Date object at 4 AM UTC
- **Rationale:** 4 AM UTC = noon in Malaysia (UTC+8)
- **Example:** Dec 13, 2025 → `2025-12-13T04:00:00.000Z`

## Related Files

- `server/src/utils/dateUtils.ts` - Date parsing utility
- `server/src/controllers/payment.controller.ts` - Payment/booking creation (FIXED)
- `server/src/controllers/booking.controller.ts` - Booking queries (uses correct parsing)
- `server/src/services/cart.service.ts` - Cart date parsing (already correct)
- `server/src/services/cartBooking.service.ts` - Cart booking creation (already correct)

## Previous Related Issues

This is similar to booking #C671EFFF (February 8, 2026) which had the same root cause. The pattern indicates that any booking created through the direct payment flow before this fix would have incorrect dates stored as midnight UTC instead of 4 AM UTC.

## Recommendation

Consider running a script to find and fix any other bookings that might have been created with midnight UTC dates instead of 4 AM UTC dates.
