const Discord = require("discord.js");
/**
 * The data when getting an streamer
 *  @typedef StreamerObject
 * @property {String} username The username of the streamer
 * @property {Discord.Guild} guild The discord server.
 * @property {String} status The status to display wheter the streamer is offline or online
 * @property {String} message The notification message
 * @property {String} channel A discord channel id
 */
exports.StreamerObject = {};
/**
 * The default options for the Twitch poster
 * @typedef options
 * @property {Number} loop_delays_in_min Amount of minutes to display when to loop.
 * @property {Object} defaults The default object for notifications
 * @property {String} client_id The twitch client id
 * @property {String} client_secret The twitch client secret
 * @property {any} provider The josh provider
 * @property {Object} providerOptions The options for the provider
 */
exports.options = {};

/**
 * Default TwitchPoster options
 * @type {options}
 */
exports.defaultOptions = {
  loop_delays_in_min: 5,
  defaults: {
    Notification: "{streamer} Is now live playing {game}. {url}",
  },
};
