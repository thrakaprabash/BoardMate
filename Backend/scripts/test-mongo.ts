// scripts/test-mongo.ts
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  try {
    console.log('URI (sanitized):', process.env.MONGO_URI?.replace(/\/\/.*?:.*?@/, '//<user>:<pass>@'));
    await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 6000 });
    console.log('✅ Connected to MongoDB');
  } catch (e) {
    console.error('❌ Connection failed:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
main();
