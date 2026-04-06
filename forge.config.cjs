/* eslint-disable @typescript-eslint/no-require-imports */
const { MakerZIP } = require("@electron-forge/maker-zip");
const { MakerDMG } = require("@electron-forge/maker-dmg");
const { AutoUnpackNativesPlugin } = require("@electron-forge/plugin-auto-unpack-natives");
const { PublisherGithub } = require("@electron-forge/publisher-github");

module.exports = {
  packagerConfig: {
    asar: true,
    osxSign: process.env.APPLE_ID
      ? {
          identity: process.env.APPLE_SIGN_IDENTITY,
        }
      : undefined,
    osxNotarize: process.env.APPLE_ID
      ? {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_APP_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID,
        }
      : undefined,
  },
  makers: [
    new MakerZIP({}, ["darwin"]),
    new MakerDMG({
      format: "ULFO",
    }),
  ],
  plugins: [new AutoUnpackNativesPlugin({})],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "hilash",
        name: "cabinet",
      },
      prerelease: false,
      draft: false,
    }),
  ],
};
