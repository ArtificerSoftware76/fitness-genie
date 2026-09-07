/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Fitness Genie uses a warm studio palette: deep ink for trust,
    // coral for momentum, and mint for recovery.
    text: '#17211F',
    tint: '#E76F51',

    // Core surfaces
    background: '#F8F6F1',
    foreground: '#17211F',

    // Cards / elevated surfaces
    card: '#FFFEFB',
    cardForeground: '#17211F',

    // Primary action color (buttons, links, active states)
    primary: '#E76F51',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E9F0EA',
    secondaryForeground: '#21473B',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EEECE6',
    mutedForeground: '#68736F',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F4C7A8',
    accentForeground: '#7B3D2C',

    // Destructive actions (delete, error states)
    destructive: '#C85151',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DDDCD3',
    input: '#D4D8D2',
  },

  dark: {
    text: '#F8F6F1',
    tint: '#F08A6D',
    background: '#16201D',
    foreground: '#F8F6F1',
    card: '#1E2B27',
    cardForeground: '#F8F6F1',
    primary: '#F08A6D',
    primaryForeground: '#16201D',
    secondary: '#29443A',
    secondaryForeground: '#D5E7DB',
    muted: '#24322E',
    mutedForeground: '#AAB9B2',
    accent: '#684B3C',
    accentForeground: '#F7D0BF',
    destructive: '#EC7777',
    destructiveForeground: '#16201D',
    border: '#34443E',
    input: '#40534B',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
