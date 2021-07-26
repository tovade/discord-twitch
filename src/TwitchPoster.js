//Import the Utils
const Discord = require("discord.js");
const Josh = require("@joshdb/core");
const Parser = require("rss-parser");
const parser = new Parser();
const colors = require("colors");
const Util = require("./Util.js");
const JoshJSON = require("@joshdb/sqlite"); //default Provider but there are also many other things like mongodb sqlite and more!
const { options, StreamerObject } = require("./Constants");

//MAKE SURE TO INSTALL THE GIVEN PROVIDER TOO!, @joshdb/json @joshdb/mongo are already installed but sqlite etc. not, this is to support REPLIT etc.
class TwitchPoster {
  /**
   * @param {Discord.Client} client A Discord Bot Client, make sure it's ready otherwise you might face some sort of bugs
   * @param {options} options Options for the YoutubePoster
   */
  constructor(client, options) {
    //get the log string
    this.ytp_log = ` >-Discord-Twitch-< `.dim.red;
    this.warn_log = `[WARN] `.yellow;
    this.info_log = `[INFO] `.cyan;
    //set the options
    if (!client) {
      throw new Error("No Valid DiscordClient Added");
    }
    this.client = client;
    this.defaults = {};
    if (!options.client_id)
      throw new Error("You did not provide a valid twitch client id");
    if (!options.client_secret)
      throw new Error("You did not provide a valid twitch client secret");

    this.options = {
      loop_delays_in_min: 5,
      defaults: {
        Notification: "{streamer} Is now live playing {game}. {url}",
      },
    };
    //set the global memer variable for the version
    this.version = require("../package.json").version;
    //loop through the custom object
    this.checkOptions(options);
    //if no method added, use this, throw error
    if (!this.constructor && !this.constructor.name) {
      throw new Error(
        `The ${this.constructor.name} class may not be instantiated!`
      );
    }
    //Create the Provider
    this.createProvider();
    //if no db found throw error
    if (!this.YTP_DB) {
      throw new Error(`Failed creating the Database`);
    }
    require("./twitchlogger")(this);
  }
  /**
   *
   * @param {options} options
   * @private
   * @ignore
   */

  checkOptions(options) {
    if (options) {
      if (options.loop_delays_in_min || options.loop_delays_in_min == 0) {
        if (typeof options.loop_delays_in_min != "number")
          throw new SyntaxError(
            `${
              `options.loop_delays_in_min`.bold
            }must be a NUMBER, you provided: ${
              `${typeof options.loop_delays_in_min}`.bold
            }`
          );
        let dela = Number(options.loop_delays_in_min);
        if (dela < 0)
          throw new SyntaxError(
            `${`options.loop_delays_in_min`.bold} must be ${
              `BIGGER or EQUAL then 0`.bold
            }, you provided: ${`${options.loop_delays_in_min}`.bold}`
          );
        if (dela > 59)
          throw new SyntaxError(
            `${`options.loop_delays_in_min`.bold} must be ${
              `SMALLER then 0`.bold
            }, you provided: ${`${options.loop_delays_in_min}`.bold}`
          );
        //set the new loop delay
        this.options.loop_delays_in_min = dela;
        console.log(
          this.ytp_log +
            this.info_log +
            `Using custom ${`options.loop_delays_in_min`.bold}: ${
              this.options.loop_delays_in_min
            } ${
              this.options.loop_delays_in_min == 0
                ? "\n" +
                  this.ytp_log +
                  this.info_log +
                  "Tho it's 0, it will only check every 15 Seconds, otherwise you would spam to MUCH!"
                    .dim.yellow
                : ""
            }`.dim.green
        );
      }
      if (options.client_id) {
        this.options.client_id = options.client_id;
      }
      if (options.client_secret) {
        this.options.client_secret = options.client_secret;
      }
      if (options.defaults) {
        if (options.defaults.Notification) {
          this.defaults.Notification = options.defaults.Notification;
          console.log(
            this.ytp_log +
              this.info_log +
              `Using custom ${`options.defaults#Notification`.bold}: ${
                this.defaults.Notification
              }`.dim.green
          );
        }
      }
      if (options.provider) {
        this.options.provider = options.provider;
        console.log(
          this.ytp_log +
            this.info_log +
            `Using custom ${`options.provider`.bold}`.dim.green
        );
      }
      if (options.providerOptions) {
        this.options.providerOptions = options.providerOptions;
        if (!this.options.providerOptions.collection) {
          this.options.providerOptions.collection = "TwitchPoster";
          console.log(
            this.ytp_log +
              this.warn_log +
              `No ${
                `options.provideroptions.collection`.bold
              } as a COLLECTION-NAME added`.dim.green
          );
          console.log(
            this.ytp_log +
              this.warn_log +
              `Using default: "TwitchPoster"`.dim.green
          );
        }
        console.log(
          this.ytp_log +
            this.info_log +
            `Using custom ${`options.providerOptions`.bold}`.dim.green
        );
      }

      return this;
    } else {
      return this;
    }
  }
  /**
   *
   * @private
   * @ignore
   */
  createProvider() {
    if (this.options) {
      if (
        !this.options.providerOptions &&
        typeof this.options.providerOptions !== "object"
      ) {
        console.log(
          this.ytp_log +
            this.info_log +
            "No Provider Options granted ".dim.yellow
        );
        return this.createDefaultProvider();
      } else {
        //use custom Options
        try {
          let provider = String(this.options.provider);
          let found = false;
          if (!found && provider.toLowerCase().includes("mongo")) {
            provider = "MongoDB";
            found = true;
          }
          if (!found && provider.toLowerCase().includes("json")) {
            provider = "JSON";
            found = true;
          }
          if (!found && provider.toLowerCase().includes("sqlite")) {
            provider = "SQLite";
            found = true;
          }
          if (!found && provider.toLowerCase().includes("indexeddb")) {
            provider = "IndexedDB";
            found = true;
          }
          console.log(
            this.ytp_log +
              this.info_log +
              `Connecting to the CUSTOM ${
                found ? `${provider} `.bold : ""
              }Database Option... Please wait...`.dim.yellow
          );
          this.YTP_DB = new Josh({
            name: "Discord-TwitchPoster",
            provider: this.options.provider,
            providerOptions: this.options.providerOptions,
          });
          this.YTP_DB.defer.then(async () => {
            let size;
            try {
              size = await this.YTP_DB.size;
            } catch {}
            try {
              if (!size) size = this.YTP_DB.count;
            } catch {}
            try {
              if (!size) size = await this.YTP_DB.length;
            } catch {}
            console.log(
              this.ytp_log +
                this.info_log +
                ` > Connected to the ${`custom`.underline} Database ${
                  size ? `| There are: ${size} Rows/Entries ` : ""
                }< `.dim.bgGreen.brightWhite
            );
          });
        } catch (error) {
          this.YTP_DB = false;
          throw error;
        }
      }
    } else {
      console.log(
        this.ytp_log +
          this.info_log +
          `No ${"CUSTOM".bold} Database Options added, using sqlite.`.italic
            .yellow
      );
      return this.createDefaultProvider();
    }
  }

  createDefaultProvider() {
    try {
      this.YTP_DB = new Josh({
        name: "Discord-TwitchPoster",
        provider: JoshJSON,
        providerOptions: {},
      });
      this.YTP_DB.defer.then(async () => {
        console.log(
          this.ytp_log +
            this.info_log +
            `Connected the sqlite-Database. There are: ${await this.YTP_DB
              .size} Rows/Entries`.dim.green
        );
        return this;
      });
    } catch (error) {
      this.YTP_DB = false;
      throw error;
    }
  }

  /** Set a new twitch username to a Guild ID
   * @param {string} ChannelLink Twitch username
   * @param {OBJECT|DiscordChannel} DiscordChannel DiscordChannel with ID && guild parameters
   * @param {string} Notification Notification Message | OPTIONAL | DEFAULT: uses the options
   * @param {Boolean} preventDuplicates Default: True
   * @returns {StreamerObject}
   */
  async setChannel(
    username,
    DiscordChannel,
    Notification,
    preventDuplicates = true
  ) {
    return new Promise(async (res, rej) => {
      try {
        if (!username) rej("No twitch username was provided");
        if (!Notification) Notification = this.options.defaults.Notification;
        if (typeof username !== "string")
          return rej("The username must be a string");
        if (!DiscordChannel || !DiscordChannel.guild || !DiscordChannel.id)
          return rej("A DiscordChannel with Guild Information is required!");
        await this.YTP_DB.ensure(DiscordChannel.guild.id, {
          channels: [],
        });
        await delay(200);
        const channels = await this.YTP_DB.get(
          `${DiscordChannel.guild.id}.channels`
        );
        if (channels) {
          let chdata = channels.find((v) => v.username === username);
          if (preventDuplicates && chdata) {
            return rej("That channel is already setup for the server.");
          }
        }
        await Util.getToken(
          this.options.client_id,
          this.options.client_secret,
          "user:read:email"
        ).then(async (result) => {
          let access_token = result.access_token;

          let user = await Util.getUserInfo(
            access_token,
            this.options.client_id,
            username
          );
          let check = true;
          if (!user) return (check = "false");
          if (!user.data) return (check = "false");
          if (!user.data[0]) {
            check = "false";
          } else {
            check = "true";
          }
          if (!check) return rej("Invalid streamer");
          const streamerAdd = {
            username: username,
            guild: DiscordChannel.guild.id,
            status: `offline`,
            message: Notification,
            channel: DiscordChannel.id,
          };
          channels.push(streamerAdd);
          await this.YTP_DB.set(
            `${DiscordChannel.guild.id}.channels`,
            channels
          );
          let OBJ = {};
          OBJ = streamerAdd;
          OBJ.allChannels = await this.YTP_DB.get(
            `${DiscordChannel.guild.id}.channels`
          );
          return res(OBJ);
        });
      } catch (error) {
        return rej(error);
      }
    });
    function delay(delayInms) {
      try {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(2);
          }, delayInms);
        });
      } catch (_) {}
    }
  }

  /** Get Channel Information about a LINK
   * @param {string} ChannelLink twitch username
   * @returns {StreamerObject}
   */
  async getChannelInfo(ChannelLink) {
    return new Promise(async (res, rej) => {
      try {
        if (!ChannelLink)
          return rej("A String is required for the twitch username");
        if (typeof ChannelLink !== "string")
          return rej(
            `Passed in ${typeof ChannelLink} but a String would be required for the twitch username`
          );
        await Util.getToken(
          this.options.client_id,
          this.options.client_secret,
          "user:read:email"
        ).then(async (result) => {
          let access_token = result.access_token;

          let user = await Util.getUserInfo(
            access_token,
            this.options.client_id,
            ChannelLink
          );
          return res(user.data[0]);
        });
      } catch (error) {
        return rej(error);
      }
    });
  }

  /** Get twitch username for LINK
   * @param {string} DiscordGuildID Discord Guild id
   * @param {string} ChannelLink twitch username
   * @returns {StreamerObject}
   */
  async getChannel(DiscordGuildID, ChannelLink) {
    return new Promise(async (res, rej) => {
      try {
        if (!DiscordGuildID)
          return rej("A String is required for the DiscordGuildID");
        if (typeof DiscordGuildID !== "string" || DiscordGuildID.length != 18)
          return rej(
            `Passed in ${typeof DiscordGuildID} but a String would be required for the DiscordGuildID`
          );
        if (!ChannelLink)
          return rej("A String is required for the ChannelLink");
        if (typeof ChannelLink !== "string")
          return rej(
            `Passed in ${typeof ChannelLink} but a String would be required for the twitch username`
          );
        await this.YTP_DB.ensure(DiscordGuildID, {
          channels: [],
        });
        await Util.delay(200);
        let channels = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        let CHdata = channels.find((v) => v.username === ChannelLink);
        if (!CHdata) {
          CHdata = "No channels";
          return rej(CHdata);
        }
        return res(CHdata);
      } catch (error) {
        return rej(error);
      }
    });
  }

  /** Edit a specific twitch username in a Guild ID
   * @param {string} ChannelLink twitch streamer
   * @param {OBJECT|DiscordChannel} DiscordChannel DiscordChannel with ID && guild parameters
   * @param {string} Notification Notification Message | OPTIONAL | DEFAULT: uses the options
   * @returns {StreamerObject}
   */
  async editChannel(
    ChannelLink,
    DiscordChannel,
    Notification = this.options.defaults.Notification
  ) {
    return new Promise(async (res, rej) => {
      try {
        if (!ChannelLink)
          return rej("A String is required for the ChannelLink");
        if (typeof ChannelLink !== "string")
          return rej(
            `Passed in ${typeof ChannelLink} but a String would be required for the twitch username`
          );
        if (!DiscordChannel || !DiscordChannel.guild || !DiscordChannel.id)
          return rej("A DiscordChannel with Guild Information is required!");
        await this.YTP_DB.ensure(DiscordChannel.guild.id, {
          channels: [],
        });
        await Util.delay(200);
        let channels = await this.YTP_DB.get(
          `${DiscordChannel.guild.id}.channels`
        );
        let CHdata = channels.find((v) => v.username === ChannelLink);
        let index = channels.findIndex((v) => v.username === ChannelLink);
        if (!CHdata) {
          rej("Channel not setup yet");
          return;
        }
        let newCHdata = {
          username: ChannelLink,
          guild: DiscordChannel.guild.id,
          status: `offline`,
          message: Notification,
          channel: DiscordChannel.id,
        };
        //remove item from the channels array which we got
        channels[index] = newCHdata;
        //set the new channels
        await this.YTP_DB.set(`${DiscordChannel.guild.id}.channels`, channels);
        let data = await this.YTP_DB.get(`${DiscordChannel.guild.id}.channels`);
        var Obj = {};
        Obj = newCHdata;
        Obj.allChannels = data;
        Obj.beforeEditChannel = CHdata;
        return res(Obj);
      } catch (error) {
        return rej(error);
      }
    });
  }

  /** Delete a specific twitch username in a Guild
   * @param {string} DiscordGuildID Discord Guild id
   * @param {string} ChannelLink
   * @returns {StreamerObject}
   */
  async deleteChannel(DiscordGuildID, ChannelLink) {
    return new Promise(async (res, rej) => {
      try {
        if (!ChannelLink)
          return rej("A String is required for the Twitch Username");
        if (typeof ChannelLink !== "string")
          return rej(
            `Passed in ${typeof ChannelLink} but a String would be required for the Twitch Username`
          );
        if (!DiscordGuildID)
          return rej("A String is required for the DiscordGuildID");
        if (typeof DiscordGuildID !== "string" || DiscordGuildID.length != 18)
          return rej(
            `Passed in ${typeof DiscordGuildID} but a String would be required for the DiscordGuildID`
          );
        await this.YTP_DB.ensure(DiscordGuildID, {
          channels: [],
        });
        await Util.delay(200);
        let channels = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        let CHdata = channels.find((v) => v.username === ChannelLink);
        let index = channels.findIndex((v) => v.username === ChannelLink);
        if (!CHdata) {
          rej("Channel not setup yet");
          return;
        }
        //remove item from the channels array which we got
        channels.splice(index, 1);
        //set the new channels
        await this.YTP_DB.set(`${DiscordGuildID}.channels`, channels);
        let data = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        var Obj = {};
        Obj.allChannels = data;
        Obj.deletedChannel = CHdata;
        return res(Obj);
      } catch (error) {
        return rej(error);
      }
    });
  }

  /** Gets all Channels of a Guild
   * @param {string} DiscordGuildID Discord Guild id
   * @returns {Array<StreamerObject>}
   */
  async getAllChannels(DiscordGuildID) {
    return new Promise(async (res, rej) => {
      try {
        if (!DiscordGuildID)
          return rej("A String is required for the DiscordGuildID");
        if (typeof DiscordGuildID !== "string" || DiscordGuildID.length != 18)
          return rej(
            `Passed in ${typeof DiscordGuildID} but a String would be required for the DiscordGuildID`
          );
        await this.YTP_DB.ensure(DiscordGuildID, {
          channels: [],
        });
        await Util.delay(200);
        let channels = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        return res(channels);
      } catch (error) {
        return rej(error);
      }
    });
  }

  /** Delete all Channels in a GUild
   * @param {string} DiscordGuildID Discord Guild id
   * @returns {Array}
   */
  async deleteAllChannels(DiscordGuildID) {
    return new Promise(async (res, rej) => {
      try {
        if (!DiscordGuildID)
          return rej("A String is required for the DiscordGuildID");
        if (typeof DiscordGuildID !== "string" || DiscordGuildID.length != 18)
          return rej(
            `Passed in ${typeof DiscordGuildID} but a String would be required for the DiscordGuildID`
          );
        let olddata = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        await this.YTP_DB.set(DiscordGuildID, {
          channels: [],
        });
        let data = await this.YTP_DB.get(`${DiscordGuildID}.channels`);
        const Obj = {};
        Obj.allChannels = data;
        Obj.deletedChannels = olddata;
        return res(Obj);
      } catch (error) {
        return rej(error);
      }
    });
  }
}
module.exports = TwitchPoster;
