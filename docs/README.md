# Endatix Hub Documentation

This is the documentation site for Endatix Hub, built with Docusaurus. The site provides comprehensive documentation for both developers and end-users of the Endatix Hub platform.

## Structure

The documentation is organized into two main sections:

### For Developers (`/docs/developers/`)
- **Quick Start**: Installation and setup guides
- **API Reference**: Complete API documentation with examples
- **Custom Development**: Building custom components and extensions
- **Deployment**: Production deployment guides
- **Contributing**: How to contribute to the project

### For End Users (`/docs/end-users/`)
- **Getting Started**: Basic platform usage
- **Form Builder**: Creating and customizing forms
- **Custom Questions**: Building custom question types
- **Integrations**: Connecting with external systems
- **Administration**: Platform management and settings

## Running the Documentation Site

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation
```bash
# Install dependencies
npm install

# Start the development server
npm run start
```

The site will be available at `http://localhost:3000`

### Building for Production
```bash
# Build the site
npm run build

# Serve the built site
npm run serve
```

## Content Organization

### Home Page (`/src/pages/index.tsx`)
The home page showcases the two main audiences (developers and end-users) with clear navigation paths and feature highlights.

### Navigation Structure
- **Main Navigation**: Developers and End Users sections
- **Sidebar Navigation**: Auto-generated from the file structure
- **Footer Links**: External resources and community links

### Key Features
- **Responsive Design**: Works on desktop and mobile
- **Search Functionality**: Full-text search across all documentation
- **Dark/Light Mode**: Toggle between themes
- **Version Control**: Support for multiple documentation versions
- **Internationalization**: Ready for multi-language support

## Content Guidelines

### Writing Style
- Use clear, concise language
- Include practical examples
- Provide step-by-step instructions
- Include screenshots where helpful

### Code Examples
- Use syntax highlighting
- Include complete, working examples
- Provide multiple language options where applicable
- Include error handling examples

### Documentation Standards
- Each page should have a clear title and description
- Use consistent formatting and structure
- Include navigation links to related content
- Keep content up-to-date with platform changes

## Customization

### Styling
- Custom CSS in `/src/css/endatix-theme.css`
- Brand colors and typography defined in the theme
- Responsive design considerations

### Configuration
- Main config: `docusaurus.config.ts`
- Sidebar structure: `sidebars.ts`
- Navigation and footer links

### Adding Content
1. Create new `.md` files in the appropriate section
2. Add frontmatter with metadata
3. Update sidebar configuration if needed
4. Test the site locally

## Deployment

The documentation site can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

### GitHub Pages Deployment
```bash
# Build the site
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Contributing

1. Create a new branch for your changes
2. Make your changes following the content guidelines
3. Test the site locally
4. Submit a pull request with a clear description

## Support

For questions about the documentation site:
- Check the [Docusaurus documentation](https://docusaurus.io/)
- Review existing content for examples
- Contact the development team

For questions about Endatix Hub:
- Check the documentation sections
- Visit [endatix.com](https://endatix.com)
- Contact support through the platform
