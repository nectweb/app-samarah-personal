module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          root: ['.'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@': '.',
          },
        },
      ],
      'expo-router/babel', // adiciona o plugin do expo-router se estiver usando
    ],
  };
};
