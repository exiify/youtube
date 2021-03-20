const mongoose = require("mongoose");

const GuildProfile = new mongoose.Schema({
  guild: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  userId: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  level: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  xp: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  total_xp: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  last_message: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
});
module.exports = mongoose.model("GuildProfile", GuildProfile)