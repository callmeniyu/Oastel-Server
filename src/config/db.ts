import mongoose from 'mongoose';
import { env } from './env';

const connectDB = async () => {
  try {
    
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB Error:', err);
});

export default connectDB;