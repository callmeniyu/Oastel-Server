import mongoose from 'mongoose';

const WebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  source: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('WebhookEvent', WebhookEventSchema);
