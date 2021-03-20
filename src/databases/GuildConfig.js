const mongoose = require("mongoose");
const GuildConfig = new mongoose.Schema({
  guild: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  prefix: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
});
module.exports = mongoose.model("GuildConfig", GuildConfig);
