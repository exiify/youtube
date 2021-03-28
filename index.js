require("dotenv").config();
const Discord = require("discord.js");
const random = require("random");
const mongoose = require("mongoose");
const Profile = require("./src/databases/Profile.js");
const GuildConfig = require("./src/databases/GuildConfig");
const canvacord = require("canvacord");
const Spotify = require("erela.js-spotify");

const client = new Discord.Client();
const { Manager } = require("erela.js");

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const clientID = "1197d3d14a924b99bb5bcc1f4c3ed0e0";
const clientSecret = "d2f7a49a775c4212becc1bb9227f2184";

client.manager = new Manager({
  nodes: [
    {
      host: "localhost",
      port: 6969,
      password: "exiifyiscool",
    },
  ],
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
  plugins: [
    // Initiate the plugin and pass the two required options.
    new Spotify({
      clientID,
      clientSecret,
    }),
  ],
})
  .on("nodeConnect", (node) =>
    console.log(`Node ${node.options.identifier} connected`)
  )
  .on("nodeError", (node, error) =>
    console.log(
      `Node ${node.options.identifier} had an error: ${error.message}`
    )
  )
  .on("trackStart", (player, track) => {
    client.channels.cache
      .get(player.textChannel)
      .send(`Now playing: ${track.title}`);
  })
  .on("queueEnd", (player) => {
    client.channels.cache.get(player.textChannel).send("Queue has ended.");

    player.destroy();
  });

client.on("ready", () => {
  console.log("I am ready ");
  client.manager.init(client.user.id);
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  // let prefix;
  await GuildConfig.findOne(
    {
      guild: message.guild.id,
    },
    async (err, data) => {
      if (err) console.log(err);
      if (!data) {
        await GuildConfig.insertMany({
          guild: message.guild.id,
          prefix: "!",
        });
      }
      //  prefix = data.prefix;
    }
  );
  Profile.findOne(
    {
      guild: message.guild.id,
      userId: message.author.id,
    },
    async (err, data) => {
      if (!data) {
        Profile.insertMany({
          guild: message.guild.id,
          userId: message.author.id,
          level: 0,
          xp: 15,
          last_message: 60000,
          total_xp: 15,
        });
      } else {
        if (Date.now() - data.last_message > 60000) {
          let randomXP = random.int(15, 25);
          data.xp += randomXP;
          data.total_xp += randomXP;
          data.last_message = Date.now();
          const xpToNext = 5 * Math.pow(data.level, 2) + 5 * data.level + 100;
          if (data.xp >= xpToNext) {
            data.level++;
            data.xp = data.xp - xpToNext;
            message.channel.send(
              `Congrats ${message.author}, you leveld up to ${data.level}`
            );
          }
        }
        data.save().catch((err) => console.log(err));
      }
    }
  );
  const prefix = "!";
  let args = message.content.split(" ");
  client.on("raw", (d) => client.manager.updateVoiceState(d));
  let cmd = args.shift().slice(prefix.length).toLowerCase();
  args = args.join(" ");
  if (!message.content.startsWith(prefix)) return;
  if (message.content === `${prefix}rank`) {
    Profile.find({
      guild: message.guild.id,
    })
      .sort([["total_xp", "descending"]])
      .exec(async (err, res) => {
        if (err) return console.log(err);

        if (!res.length)
          return message.channel.send("Strange, no one has xp yet!");
        const user = message.mentions.users.first();
        if (!user) {
          for (let i = 0; i < res.length; i++) {
            if (res[i].userId != message.author.id) {
              if (i >= res.length - 1) {
                return;
              } else {
                continue;
              }
            } else {
              const xpToNext =
                5 * Math.pow(res[i].level, 2) + 5 * res[i].level + 100;
              const rankCard = new canvacord.Rank()
                .setAvatar(message.author.displayAvatarURL({ format: "png" }))
                .setRequiredXP(xpToNext)
                .setCurrentXP(res[i].xp)
                .setLevel(res[i].level)
                .setUsername(message.author.username)
                .setProgressBar("#FFF", "COLOR")

                .setDiscriminator(message.author.discriminator);
              rankCard.build().then((data) => {
                const attachment = new Discord.MessageAttachment(
                  data,
                  "rankcard.png"
                );
                message.channel.send(attachment);
              });
            }
          }
        } else {
          for (let i = 0; i < res.length; i++) {
            if (res[i].userId != user.id) {
              if (i >= res.length - 1) {
                return;
              } else {
                continue;
              }
            } else {
              const xpToNext =
                5 * Math.pow(res[i].level, 2) + 5 * res[i].level + 100;
              const rankCard = new canvacord.Rank()
                .setAvatar(user.displayAvatarURL({ format: "png" }))
                .setRequiredXP(xpToNext)
                .setCurrentXP(res[i].xp)
                .setLevel(res[i].level)
                .setUsername(user.username)
                .setProgressBar("#FFF", "COLOR")
                .setDiscriminator(user.discriminator);
              rankCard.build().then((data) => {
                const attachment = new Discord.MessageAttachment(
                  data,
                  "rankcard.png"
                );
                message.channel.send(attachment);
              });
            }
          }
        }
      });
  } else if (message.content.startsWith(`${prefix}play`)) {
    const search = await client.manager.search(args, message.author);
    const player = client.manager.create({
      guild: message.guild.id,
      textChannel: message.channel.id,
      voiceChannel: message.member.voice.channelID,
    });

    switch (search.loadType) {
      case "TRACK_LOADED":
        player.connect();
        player.queue.add(search.tracks[0]);
        message.channel.send(`Added ${search.tracks[0].title}`);
        if (!player.playing && !player.paused && !player.queue.size)
          player.play();
        break;
      case "SEARCH_RESULT":
        player.connect();
        player.queue.add(search.tracks[0]);
        message.channel.send(`Added ${search.tracks[0].title}`);
        if (!player.playing && !player.paused && !player.queue.size)
          player.play();
        break;
      case "PLAYLIST_LOADED":
        player.connect();
        player.queue.add(search.tracks);
        message.channel.send(`Added ${search.playlist.name} to the queue!`);
        if (
          !player.playing &&
          !player.paused &&
          player.queue.totalSize === res.tracks.length
        )
          player.play();
        break;
      case "NO_MATCHES":
        if (!player.queue.current) player.destroy();
        message.channel.send("Nothing was found with your query!");
        break;
      case "LOAD_FAILED":
        if (!player.queue.current) player.destroy();
        message.channel.send("Something went wrong");
        break;
    }
  } else if (message.content.startsWith(`${prefix}pause`)) {
    const player = client.manager.players.get(message.guild.id);
    if (!player) return message.channel.send("Bruh there is nothing playing");
    await player.pause(true);
    message.channel.send("Paused!");
  } else if (message.content.startsWith(`${prefix}resume`)) {
    const player = client.manager.players.get(message.guild.id);
    if (!player) return message.channel.send("Bruh there is nothing playing");
    await player.pause(false);
    message.channel.send("Resumed!");
  } else if (message.content.startsWith(`${prefix}leave`)) {
    const player = client.manager.players.get(message.guild.id);
    if (!player) return message.channel.send("Bruh there is nothing playing");
    await player.destroy();
    message.channel.send("Left the VC and destroyed the player!");
  }
});

client.login(process.env.TOKEN);
