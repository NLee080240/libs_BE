const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    nameCategory: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


categorySchema.pre('save', function (next) {
  if (this.isModified('nameCategory') || this.isNew) {
    this.slug = this.nameCategory
      .toLowerCase()
      .normalize('NFD') 
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-') 
      .replace(/^-+|-+$/g, ''); 
  }
  next();
});

module.exports = mongoose.model('category', categorySchema);
