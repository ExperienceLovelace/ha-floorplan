module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current", // Target the current Node.js version
        },
      },
    ],
  ],
};
