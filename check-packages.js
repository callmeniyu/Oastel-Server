const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oastel');

// Define schemas to check existing data
const TourSchema = new mongoose.Schema({}, { strict: false });
const TransferSchema = new mongoose.Schema({}, { strict: false });

const Tour = mongoose.model('Tour', TourSchema);
const Transfer = mongoose.model('Transfer', TransferSchema);

async function checkExistingPackages() {
  try {
    console.log('=== CHECKING EXISTING PACKAGES ===');
    
    // Find existing tours
    const tours = await Tour.find({}).limit(3).select('_id title slug');
    console.log('\n📋 Available Tours:');
    tours.forEach(tour => {
      console.log(`  - ID: ${tour._id}`);
      console.log(`    Title: ${tour.title || 'No title'}`);
      console.log(`    Slug: ${tour.slug || 'No slug'}`);
      console.log('    ---');
    });

    // Find existing transfers
    const transfers = await Transfer.find({}).limit(3).select('_id title slug from to');
    console.log('\n🚌 Available Transfers:');
    transfers.forEach(transfer => {
      console.log(`  - ID: ${transfer._id}`);
      console.log(`    Title: ${transfer.title || 'No title'}`);
      console.log(`    From: ${transfer.from || 'No from'}`);
      console.log(`    To: ${transfer.to || 'No to'}`);
      console.log('    ---');
    });

    // Print recommendations
    console.log('\n💡 Recommendations:');
    if (tours.length > 0) {
      console.log(`Use tour ID: ${tours[0]._id} (${tours[0].title})`);
    } else {
      console.log('No tours found - need to create a test tour first');
    }
    
    if (transfers.length > 0) {
      console.log(`Use transfer ID: ${transfers[0]._id} (${transfers[0].title || transfers[0].from + ' to ' + transfers[0].to})`);
    } else {
      console.log('No transfers found - need to create a test transfer first');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkExistingPackages();
