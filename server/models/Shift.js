import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'General'],
      required: true,
      unique: true,
    },
    startTime: {
      type: String, // e.g. "09:00"
      required: true,
    },
    endTime: {
      type: String, // e.g. "18:00"
      required: true,
    },
    minimumEmployees: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);