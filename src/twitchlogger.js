// ************ IMPORT FILE DATA ************* //
const Util = require("./Util.js");
let cooldown = false;

module.exports = (YTP) => {
  if (
    (!YTP.options.loop_delays_in_min || !YTP.options.loop_delays_in_min) &&
    YTP.options.loop_delays_in_min != 0
  )
    throw new Error(
      "No Loop Delay added TwitchPoster.options.loop_delays_in_min "
    );
  if (typeof YTP.options.loop_delays_in_min != "number")
    throw new Error("TwitchPoster.options.loop_delays_in_min is not a Number");
  setInterval(() => {
    check();
  },  YTP.options.loop_delays_in_min * 100000);
  /** Check all Database entries for latest Upload + Send it
   * @param
   */
  async function check() {
    if (!YTP.client.user) {
      console.log(
        YTP.ytp_log +
          YTP.warn_log +
          " The client is not online yet, retrying in 5 Seconds".dim.yellow
      );
      setTimeout(() => {
        check();
      }, 5000);
      return;
    }
    cooldown = true;
    //get the Keys
    var keys = await YTP.YTP_DB.keys;
    keys.forEach(async (key) => {
      //get the Channels from the key
      var allChannels = await YTP.YTP_DB.get(`${key}.channels`);
      //if no channels defined yet, return
      if (!allChannels || allChannels.length == 0) return;
      //loop through all yt channels
      allChannels.forEach(async (ChannelDATA, index) => {
        try {
          if (!ChannelDATA.username) return;
          await Util.getToken(
            YTP.options.client_id,
            YTP.options.client_secret,
            "user:read:email"
          ).then(async (result) => {
            let access_token = result.access_token;

            let user = await Util.getUserInfo(
              access_token,
              YTP.options.client_id,
              ChannelDATA.username
            );

            let stream_info = await Util.getStream(
              access_token,
              YTP.options.client_id,
              user.data[0].id
            );
            if (!stream_info.data || !stream_info.data.length) return;
            if (!stream_info.data[0]) {
              var dat = [ChannelDATA.username, ChannelDATA.guild, "OFFLINE"];
            } else {
              var dat = [
                ChannelDATA.username,
                ChannelDATA.guild,
                stream_info.data[0].user_name,
                stream_info.data[0].game_id,
                stream_info.data[0].title,
                stream_info.data[0].viewer_count,
                stream_info.data[0].thumbnail_url,
                user.data[0].profile_image_url,
              ];
            }
            if (dat[3] == "OFFLINE") {
              if (ChannelDATA.status == "offline") {
                return;
              } else {
                ChannelDATA.status = "offline";
                allChannels[index] = ChannelDATA;
                return;
              }
            } else {
              if (ChannelDATA.status == "offline") {
                ChannelDATA.status = "online";
                allChannels[index] = ChannelDATA;
                await Util.getToken(
                  YTP.options.client_id,
                  YTP.options.client_secret,
                  "analytics:read:games"
                ).then(async (result) => {
                  const streamInfo = await Util.getGames(
                    result.access_token,
                    YTP.options.client_id,
                    dat[3]
                  );
                  if (!streamInfo.data[0]) return;
                  let DCchannel;
                  try {
                    //try to get a DC channel from cache
                    DCchannel = await YTP.client.channels.cache.get(
                      ChannelDATA.channel
                    );
                    //if no Channel found, fetch it
                    if (!DCchannel) {
                      DCchannel = await YTP.client.channels.fetch(
                        ChannelDATA.channel
                      );
                    }
                  } catch {
                    //Do some logging because it failed finding it
                    console.log(
                      YTP.ytp_log +
                        `Could not find the Discord Channel for ${
                          ChannelDATA.username
                        }\n${JSON.stringify(ChannelDATA)}`.italic.brightRed
                    );
                    console.log(YTP.ytp_log + "Removing it from the DB...");
                    //delete the Channel
                    await YTP.deleteChannel(
                      ChannelDATA.guild,
                      ChannelDATA.username
                    );
                  }
                  if (!DCchannel) return;
                  var version = require("discord.js").version.split("");
                  if (version.includes("(")) {
                    version = version.join("").split("(").pop().split("");
                  }
                  version = parseInt(version[0] + version[1]);
                  if (version == 12) {
                    await DCchannel.send(
                      replaceContents(
                        ChannelDATA.message,
                        streamInfo.data[0],
                        dat,
                        ChannelDATA
                      )
                    );
                  } else if (version == 13) {
                    await DCchannel.send({
                      content: replaceContents(
                        ChannelDATA.message,
                        streamInfo.data[0],
                        dat,
                        ChannelDATA
                      ),
                    });
                  }
                });
              }
            }
          });
        } catch (e) {
          console.log(e.stack);
        }
      });
    });
  }
};
function replaceContents(txt, stream, dat, ChannelDATA) {
  return String(txt)
    .replace(/{game}/gi, stream.name)
    .replace(/{gameName/gi, stream.name)
    .replace(/{views}/gi, dat[5])
    .replace(/{name}/gi, dat[0])
    .replace(/{streamer}/gi, dat[0])
    .replace(/{url}/gi, `https://twitch.tv/${dat[0].toLowerCase()}`)
    .replace(/{link}/gi, `https://twitch.tv/${dat[0].toLowerCase()}`);
}
