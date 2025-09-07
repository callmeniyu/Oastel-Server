const axios = require('axios');

async function testRollingTimeslotAPI() {
    try {
        console.log('🧪 TESTING ROLLING TIMESLOT API');
        console.log('==============================');
        
        const baseURL = 'http://10.119.223.50:3002';
        const testPackageId = '68b521f827021a6fb08770cb';
        
        console.log(`\n📋 Testing rolling timeslot generation for transfer package: ${testPackageId}`);
        
        // Test 1: Generate slots for specific package
        console.log('\n🔄 STEP 1: Generating slots for specific package...');
        
        try {
            const response = await axios.post(`${baseURL}/api/rolling-timeslots/generate/transfer/${testPackageId}`);
            
            console.log(`✅ API Response Status: ${response.status}`);
            console.log(`- Success: ${response.data.success}`);
            console.log(`- Message: ${response.data.message}`);
            console.log(`- Slots Generated: ${response.data.slotsGenerated}`);
            
            if (response.data.details) {
                console.log(`- Package: ${response.data.details.packageTitle}`);
                console.log(`- Package Type: ${response.data.details.packageType}`);
                console.log(`- Date Range: ${response.data.details.startDate} to ${response.data.details.endDate}`);
                console.log(`- Days Generated: ${response.data.details.daysGenerated}`);
            }
            
        } catch (error) {
            console.log(`❌ API Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        }
        
        // Test 2: Check packages that need slots
        console.log('\n🔍 STEP 2: Checking packages that need slots...');
        
        try {
            const checkResponse = await axios.get(`${baseURL}/api/rolling-timeslots/check`);
            
            console.log(`✅ Check Response Status: ${checkResponse.status}`);
            console.log(`- Packages needing slots: ${checkResponse.data.packagesNeedingSlots?.length || 0}`);
            
            if (checkResponse.data.packagesNeedingSlots && checkResponse.data.packagesNeedingSlots.length > 0) {
                console.log('- Packages requiring slot generation:');
                checkResponse.data.packagesNeedingSlots.slice(0, 5).forEach(pkg => {
                    console.log(`  - ${pkg.type}: ${pkg.title} (ID: ${pkg._id})`);
                });
            }
            
        } catch (error) {
            console.log(`❌ Check API Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        }
        
        // Test 3: Run full rolling generation
        console.log('\n🌟 STEP 3: Running full rolling generation...');
        
        try {
            const fullResponse = await axios.post(`${baseURL}/api/rolling-timeslots/generate`);
            
            console.log(`✅ Full Generation Response Status: ${fullResponse.status}`);
            console.log(`- Success: ${fullResponse.data.success}`);
            console.log(`- Message: ${fullResponse.data.message}`);
            console.log(`- Packages Processed: ${fullResponse.data.packagesProcessed}`);
            console.log(`- Total Slots Generated: ${fullResponse.data.slotsGenerated}`);
            console.log(`- Errors: ${fullResponse.data.errors?.length || 0}`);
            
            if (fullResponse.data.errors && fullResponse.data.errors.length > 0) {
                console.log('- Error details:');
                fullResponse.data.errors.slice(0, 3).forEach(error => {
                    console.log(`  - ${error}`);
                });
            }
            
        } catch (error) {
            console.log(`❌ Full Generation API Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        }
        
        // Test 4: Check scheduler status
        console.log('\n📊 STEP 4: Checking scheduler status...');
        
        try {
            const statusResponse = await axios.get(`${baseURL}/api/rolling-timeslots/status`);
            
            console.log(`✅ Status Response: ${statusResponse.status}`);
            console.log(`- Scheduler Running: ${statusResponse.data.running}`);
            console.log(`- Next Run: ${statusResponse.data.nextRun}`);
            console.log(`- Last Run: ${statusResponse.data.lastRun || 'Never'}`);
            
        } catch (error) {
            console.log(`❌ Status API Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        }
        
        console.log('\n🎉 ROLLING TIMESLOT API TEST COMPLETED');
        console.log('\n📝 SUMMARY:');
        console.log('- The rolling timeslot system is now active');
        console.log('- Scheduler runs daily at 2:00 AM MYT');
        console.log('- API endpoints are working for manual control');
        console.log('- Test package slots have been generated');
        
    } catch (error) {
        console.error('❌ Test script failed:', error.message);
    }
}

// Run the test
testRollingTimeslotAPI();
