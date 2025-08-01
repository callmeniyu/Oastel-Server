console.log('🚀 Starting minimum person verification test...');

// Check if we can connect to the API
const http = require('http');

function checkServer(port = 3002) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: '/api/timeslots/server-datetime',
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            console.log(`✅ Server is running on port ${port}`);
            resolve(true);
        });

        req.on('error', () => {
            console.log(`❌ Server is not running on port ${port}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`⏰ Server connection timeout on port ${port}`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('\n📋 To run the server:');
        console.log('1. Open terminal in the server directory');
        console.log('2. Run: npm run dev');
        console.log('3. Wait for "Server running on port 3002"');
        console.log('4. Then run: node test-complete-verification.js');
        return;
    }
    
    console.log('\n🧪 Server is ready! Running the complete verification test...');
    console.log('This will test the minimum person logic thoroughly.\n');
    
    // Load and run the complete test
    require('./test-complete-verification.js');
}

main();
