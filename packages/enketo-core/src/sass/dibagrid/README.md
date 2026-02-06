# Dibagrid Theme

A modern, clean grid-based form theme for Enketo, optimized for desktop use.

## Overview

The Dibagrid theme is a radical modernization of the classic grid theme, designed to provide a cleaner, more intuitive form-filling experience on desktop computers.

## Key Features

### 1. Wider Form Layout
- Maximum content width increased to 1400px (vs 1100px in grid)
- Optimized for desktop screens with minimum breakpoint at 768px
- Better use of screen real estate

### 2. Consistent Input Styling
- All input types (text, number, date, select, etc.) share the same:
  - Height: 40px
  - Border radius: 6px
  - Border color and shadow styling
  - Focus states with subtle brand-colored shadow
- Visible input borders eliminate confusion with empty cells

### 3. Clean Notes
- Notes appear as normal text without shaded backgrounds
- Transparent background for better visual integration
- Normal font weight and size

### 4. Modern Groups & Repeat Groups
- Clean header styling with brand-colored bottom border
- Smooth collapse/expand animations
- Modern chevron icons (replaces triangles)
- Repeat instances clearly separated with numbered badges
- Remove buttons styled as subtle danger buttons

### 5. Clear Visual Hierarchy
- Nested groups distinguished by:
  - Colored left border (intensity decreases with depth)
  - Subtle background color changes
  - Progressive indentation via padding
  - Font size adjustments for headers
- No more confusing ">>" prefixes

### 6. Reduced Font Sizes
- Base font: 14px (vs 16px in grid)
- Labels: 11px uppercase
- Hints: 12px
- Modern, clean typography using system fonts

### 7. Better Visual Flow
- Questions have subtle borders between cells
- Hover states provide feedback
- Focus states include left-border accent
- Groups flow naturally into their contents

## Color Palette

| Variable | Color | Usage |
|----------|-------|-------|
| `$brand-primary-color` | #9D2235 | Primary accent, borders, badges |
| `$color-gray-*` | Various | UI elements, backgrounds |
| `$color-white` | #FFFFFF | Backgrounds |
| `$color-error` | #F44336 | Validation errors |
| `$color-success` | #4CAF50 | Success states |

## File Structure

```
dibagrid/
├── dibagrid.scss        # Main entry point
├── dibagrid-print.scss  # Print stylesheet entry
├── _variables.scss      # Theme variables
├── _mixins.scss         # Theme mixins
├── _main.scss          # Main styles
├── _widgets.scss       # Widget overrides
├── _print.scss         # Print-specific styles
└── README.md           # This file
```

## Usage

### In SCSS
```scss
@import 'dibagrid/dibagrid';
```

### For Print
```scss
@import 'dibagrid/dibagrid-print';
```

## Grid System

The theme supports the same grid width classes as the original grid theme:

- `.or-appearance-w1` through `.or-appearance-w13`
- Nested width classes work within parent containers
- Default grid width of 4 columns

Example:
```xml
<group appearance="w4">
  <input appearance="w1">...</input>
  <input appearance="w2">...</input>
  <input appearance="w1">...</input>
</group>
```

## Browser Support

Optimized for modern desktop browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Customization

### Overriding Variables

Create a file that imports variables before the theme:

```scss
// Override primary color
$brand-primary-color: #yourcolor;

// Then import the theme
@import 'dibagrid/dibagrid';
```

### Key Variables to Customize

```scss
// Colors
$brand-primary-color: #9D2235;
$color-gray-*: various shades;

// Sizing
$font-size-base: 14px;
$input-height: 40px;
$input-border-radius: 6px;
$max-content-width: 1400px;

// Spacing
$q-pad-top: 12px;
$q-pad-side: 16px;
$q-pad-bottom: 16px;
```

## Migration from Grid Theme

The Dibagrid theme is designed as a drop-in replacement for the grid theme. Key differences to note:

1. Forms will appear wider
2. Input fields will have visible borders
3. Group headers have a different style
4. Nested groups use left borders instead of >> prefixes
5. Notes lose their shaded background

## Contributing

When modifying this theme:
1. Follow the existing code organization
2. Use the defined variables and mixins
3. Test across different form complexities
4. Ensure print styles remain functional
