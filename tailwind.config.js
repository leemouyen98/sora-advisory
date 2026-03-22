/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Apple HIG System Colors
        'hig-blue': '#007AFF',
        'hig-green': '#34C759',
        'hig-orange': '#FF9500',
        'hig-red': '#FF3B30',
        'hig-teal': '#5AC8FA',
        'hig-purple': '#AF52DE',
        'hig-pink': '#FF2D55',
        'hig-gray': {
          1: '#8E8E93',
          2: '#AEAEB2',
          3: '#C7C7CC',
          4: '#D1D1D6',
          5: '#E5E5EA',
          6: '#F2F2F7',
        },
        'hig-bg': '#F2F2F7',
        'hig-card': '#FFFFFF',
        'hig-text': '#1C1C1E',
        'hig-text-secondary': '#8E8E93',
        'hig-separator': '#C6C6C8',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
          'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        'hig': '12px',
        'hig-sm': '8px',
        'hig-lg': '16px',
      },
      boxShadow: {
        'hig': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'hig-md': '0 4px 12px rgba(0,0,0,0.08)',
        'hig-lg': '0 8px 24px rgba(0,0,0,0.12)',
      },
      fontSize: {
        'hig-title1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'hig-title2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'hig-title3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'hig-headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'hig-body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'hig-callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'hig-subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'hig-footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'hig-caption1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'hig-caption2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      transitionDuration: {
        'hig': '250ms',
      },
    },
  },
  plugins: [],
}
