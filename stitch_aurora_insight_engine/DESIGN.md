---
name: Aura AI
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2b2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c9c6c5'
  primary: '#c9c6c5'
  on-primary: '#313030'
  primary-container: '#0a0a0a'
  on-primary-container: '#7b7979'
  inverse-primary: '#5f5e5e'
  secondary: '#e6feff'
  on-secondary: '#003739'
  secondary-container: '#00f4fe'
  on-secondary-container: '#006c71'
  tertiary: '#dfb7ff'
  on-tertiary: '#4b007e'
  tertiary-container: '#140028'
  on-tertiary-container: '#9e57dd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#63f7ff'
  secondary-fixed-dim: '#00dce5'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#f1daff'
  tertiary-fixed-dim: '#dfb7ff'
  on-tertiary-fixed: '#2d004f'
  on-tertiary-fixed-variant: '#6717a5'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  code-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1280px
---

## Brand & Style

The design system is centered on the concept of "Illuminated Intelligence." It targets researchers, analysts, and power users who require a high-performance environment that feels both sophisticated and hyper-modern. The brand personality is intellectually rigorous yet effortless to navigate.

The visual style blends **Minimalism** with **Glassmorphism**. A deep, obsidian foundation provides the canvas for "Aurora" accents—dynamic, fluid light paths that represent the flow of information and AI reasoning. The aesthetic is high-contrast in its lighting but low-contrast in its structural elements, using subtle translucency and ultra-fine borders to define space without introducing visual noise.

## Colors

The palette is anchored by **Deep Obsidian**, a near-black that minimizes eye strain and maximizes the "pop" of data visualizations. 

- **Primary (Background):** #0A0A0A. Used for the main application canvas.
- **Secondary (Cyan):** #00F5FF. Represents active states, research threads, and primary actions.
- **Tertiary (Violet):** #BF77FF. Used for AI insights, synthesized data, and premium features.
- **Accent (Emerald):** #00FFC2. Indicates completion, verification, and successful data retrieval.
- **Neutral (Grays):** A range of cool-toned grays from #1A1A1A (surfaces) to #EDEDED (primary text).

Gradients should be used sparingly but impactfully, typically as "Aurora lines"—1px wide paths that transition between Cyan, Violet, and Emerald to guide the eye toward active AI processes.

## Typography

This design system utilizes **Inter** as its primary typeface to ensure maximum legibility across dense research data and complex AI responses. Its neutral, systematic nature reinforces the platform's professional utility.

For technical metadata, code snippets, and system status indicators, **JetBrains Mono** is employed to provide a distinct "developer-grade" feel that aligns with the AI research context. 

Typography scales are generous. Body text is prioritized for long-form readability, while headlines use tighter letter spacing and medium weights to appear more "architectural" and structured.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** approach for the central research console, centered within the viewport to maintain focus. The main content container has a maximum width of 1280px.

- **Desktop (1200px+):** 12-column grid with 24px gutters. Sidebars for navigation and history are collapsible to maximize research "deep work" space.
- **Tablet (768px - 1199px):** 8-column grid with 20px gutters. Sidebars transition to off-canvas overlays.
- **Mobile (<767px):** 4-column grid with 16px gutters.

Spacing follows a strict 8px linear scale. Generous whitespace is used between distinct AI response modules to prevent cognitive overload, while internal card padding remains compact to maximize data density.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

1.  **Base Level (L0):** Deep Obsidian (#0A0A0A) background.
2.  **Surface Level (L1):** Sub-containers and cards use a slightly lighter neutral (#161616) with a 1px #FFFFFF10 border.
3.  **Floating Level (L2):** Search bars and active chat boxes use a backdrop blur (20px) and a semi-transparent fill (rgba(255, 255, 255, 0.03)). 
4.  **Accent Elevation:** Active elements or "AI Focus" states are highlighted with a 1px "Aurora" gradient border or an ultra-diffused outer glow using the secondary Cyan color at 10% opacity.

## Shapes

The shape language is modern and approachable, utilizing a **Rounded** (Level 2) corner strategy. 

- **Cards and Input Fields:** 0.5rem (8px) radius.
- **Primary Action Buttons:** 1rem (16px) radius to create a distinct, interactive "pill-like" feel.
- **Search Bar:** Fully rounded (pill) to emphasize its role as the primary entry point for exploration.

This balance of structural squares and softer interactive elements reflects the intersection of hard data and intuitive AI assistance.

## Components

### Search Bar
The centerpiece of the platform. It uses a high-blur glassmorphism background, a subtle 1px border, and a "breath" animation on the border when active. Icons are minimal, 20px line-art.

### AI Chat Modules
Individual response blocks are separated by 32px of whitespace. Each module has a subtle background tint: a very faint violet glow for AI-generated insights and a neutral tint for user queries.

### Buttons
- **Primary:** Solid Cyan (#00F5FF) with black text for high contrast.
- **Secondary:** Transparent with a 1px neutral-gray border, shifting to a Cyan border on hover.
- **Ghost:** Text-only with an underline effect on hover.

### Progress & Loading
Instead of spinners, use linear "Aurora" progress bars—thin 2px lines that animate a gradient across the top of the container, signifying the fluid motion of research retrieval.

### Data Chips
Small, 0.25rem rounded badges used for tags (e.g., "Source: Academic," "Verified"). These use low-opacity versions of the accent colors (e.g., 10% Cyan fill with 100% Cyan text).