export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17212b',
        line: '#d7dee6',
        field: '#f4f7f9',
        win: '#0f7a5c',
        loss: '#aa3f3f',
      },
      boxShadow: {
        panel: '0 14px 45px rgba(23, 33, 43, 0.08)',
      },
    },
  },
  plugins: [],
}
