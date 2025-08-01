# TimeSlot minimumPerson Fix Instructions

## Issue Summary

- **Problem**: TimeSlot slots are created with `minimumPerson: 1` instead of the package's actual `minimumPerson` value (e.g., 2)
- **Expected Behavior**: TimeSlot slots should initially use the package's `minimumPerson` value, then change to 1 after first booking (for non-private tours)

## Fixes Applied

1. **Schema Fix**:

   - Removed the default value `1` from `minimumPerson` in the TimeSlot schema
   - This prevents new slots from automatically using 1 instead of the package's value

2. **Generation Logic Fix**:

   - Enhanced logging in slot generation to ensure `minimumPerson` is passed correctly
   - Made the slot creation more explicit to ensure the package's `minimumPerson` is used

3. **Update Logic Fix**:

   - Modified `updateSlotsForPackage` to properly fetch and use the package's `minimumPerson`
   - For slots with bookings in non-private packages, set `minimumPerson` to 1
   - For slots with no bookings, use the package's `minimumPerson` value

4. **Migration Script**:
   - Created a script to fix existing TimeSlots that might have incorrect values

## How to Apply the Fixes

### Step 1: Restart the Server

```bash
# Stop your current server and restart it to apply the schema and code changes
cd /d/Devguru/clients/oastel/source/server
npm run dev
```

### Step 2: Run the Migration Script

```bash
# In a separate terminal, run the migration script to fix existing data
cd /d/Devguru/clients/oastel/source/server
node fix-minimum-person.js
```

### Step 3: Verify the Fix

1. Create a new tour/transfer with `minimumPerson` set to 2 or higher
2. Check that generated slots have the correct `minimumPerson` value
3. Make a booking and verify the `minimumPerson` changes to 1 after first booking
4. Check that subsequent bookings can be made with 1 person

### Step 4: Update Existing Slots (if needed)

```bash
# If you need to regenerate slots for a specific package:
# 1. Use the API endpoint to regenerate slots
# PUT /api/timeslots/package
# {
#   "packageType": "tour",
#   "packageId": "your-package-id",
#   "departureTimes": ["08:00", "14:00"],
#   "capacity": 10
# }
```

## Expected Results

1. **For New Slots**:

   - New time slots will be created with `minimumPerson` value from the package
   - Example: If package has `minimumPerson: 2`, slots will have `minimumPerson: 2`

2. **After First Booking**:

   - For non-private packages: `minimumPerson` changes to 1
   - For private packages: `minimumPerson` remains unchanged

3. **Existing Slots**:
   - The migration script fixes existing slots to have correct values
   - Slots with no bookings: set to package's `minimumPerson`
   - Slots with bookings (non-private): set to 1

## Need Further Help?

If issues persist, check the server logs for any errors during slot generation or booking.
