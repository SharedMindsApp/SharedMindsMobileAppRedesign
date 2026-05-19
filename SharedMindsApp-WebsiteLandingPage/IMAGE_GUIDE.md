# Image Management Guide

## How to Change Images

All images in the SharedMinds website are managed through a central configuration object called `IMAGE_CONFIG` located at the top of `src/App.tsx`.

### Location

Open `src/App.tsx` and find the `IMAGE_CONFIG` object near the top of the file (around line 4).

### Structure

```javascript
const IMAGE_CONFIG = {
  hero: {
    url: 'your-image-url-here',
    alt: 'Description for screen readers'
  },
  audiences: {
    adhd: { url: '...', alt: '...' },
    parents: { url: '...', alt: '...' },
    professionals: { url: '...', alt: '...' },
    creatives: { url: '...', alt: '...' }
  },
  guardrails: {
    url: '...',
    alt: '...'
  },
  regulation: {
    url: '...',
    alt: '...'
  }
};
```

## Where Each Image Appears

### `hero`
- **Location**: Top of the homepage, right side of the main hero section
- **Recommended**: A person in thoughtful moment, reflecting, or planning
- **Aspect Ratio**: Portrait or square

### `audiences.adhd`
- **Location**: "Who it's for" section, first card (ADHD / executive dysfunction)
- **Recommended**: Person working thoughtfully, focused but relaxed
- **Aspect Ratio**: Landscape (16:9)

### `audiences.parents`
- **Location**: "Who it's for" section, second card (Neurodivergent thinkers)
- **Recommended**: Person managing multiple tasks or family life
- **Aspect Ratio**: Landscape (16:9)

### `audiences.professionals`
- **Location**: "Who it's for" section, third card (Creatives & builders)
- **Recommended**: Professional managing projects or creative work
- **Aspect Ratio**: Landscape (16:9)

### `audiences.creatives`
- **Location**: "Who it's for" section, fourth card (Complex projects/lives)
- **Recommended**: Creative person organizing ideas or projects
- **Aspect Ratio**: Landscape (16:9)

### `guardrails`
- **Location**: Background of the Spaces feature page (shown at 20% opacity)
- **Recommended**: Focused work environment or calm workspace
- **Aspect Ratio**: Any (used as background)

### `regulation`
- **Location**: Background of the Regulation feature page (shown at 20% opacity)
- **Recommended**: Calm, regulated environment or peaceful setting
- **Aspect Ratio**: Any (used as background)

## How to Update Images

### Option 1: Using Pexels or other stock photo sites

1. Find your image on [Pexels](https://www.pexels.com), [Unsplash](https://unsplash.com), or similar
2. Copy the image URL
3. Update the corresponding `url` in `IMAGE_CONFIG`
4. Update the `alt` text to describe the image for accessibility

Example:
```javascript
hero: {
  url: 'https://images.pexels.com/photos/YOUR-IMAGE-ID/pexels-photo-YOUR-IMAGE-ID.jpeg',
  alt: 'Person working on a laptop in a bright cafe'
}
```

### Option 2: Using local images

1. Place your image in the `public` folder
2. Reference it with a relative path starting with `/`
3. Update the `alt` text

Example:
```javascript
hero: {
  url: '/hero-image.jpg',
  alt: 'Person working on a laptop in a bright cafe'
}
```

## Tips

- **Alt Text**: Always write descriptive alt text for accessibility
- **Image Quality**: Use high-resolution images (at least 1200px wide for hero, 800px for audience cards)
- **File Size**: Optimize images to keep file sizes reasonable (use compression if needed)
- **Consistency**: Try to maintain a consistent style across all images
- **Testing**: After changing images, check the site to ensure they look good

## Need Help?

If you run into issues or need to change where images are displayed, the actual image components are located throughout `src/App.tsx`. Search for `IMAGE_CONFIG` to find all references.
