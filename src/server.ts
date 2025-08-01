import './config/env'; // Load environment variables first
import app from './app';
import connectDB from './config/db';

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || '192.168.163.50';

// Connect to MongoDB first
connectDB().then(() => {
    // Only start the server after successful database connection
    app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`)
    });
}).catch(error => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
});