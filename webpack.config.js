const { merge } = require('webpack-merge');

module.exports = (baseConfig) =>
    merge(baseConfig, {
        module: {
            rules: [
                {
                    test: /\.md$/,
                    use: [
                        {
                            loader: 'raw-loader',
                            options: {
                                esModule: true
                            },
                        },
                    ],
                },
            ],
        },
    });
