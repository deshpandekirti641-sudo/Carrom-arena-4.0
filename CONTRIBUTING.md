# Contributing to Carrom Arena

We love your input! We want to make contributing to Carrom Arena as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Quick Start for Contributors

### Prerequisites

- Node.js >= 18.17.0
- npm >= 8.0.0
- Git

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/carrom-arena.git
cd carrom-arena

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

## 🔄 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# OR
git checkout -b fix/your-bug-fix
```

### 2. Make Changes
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Run tests: `npm test`
- Check types: `npm run type-check`
- Format code: `npm run format`

### 3. Commit Your Changes
```bash
git add .
git commit -m "feat: add amazing new feature"
# OR
git commit -m "fix: resolve payment gateway issue"
```

#### Commit Message Convention
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

### 4. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 🧪 Testing Guidelines

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- GameEngine.test.ts

# Run tests with coverage
npm run test:coverage
```

### Writing Tests
- Write unit tests for utility functions
- Write integration tests for API endpoints
- Write component tests for React components
- Write E2E tests for critical user flows

Example test structure:
```typescript
describe('Carrom Game Engine', () => {
  it('should initialize game board correctly', () => {
    // Test implementation
  });
  
  it('should handle player moves', () => {
    // Test implementation
  });
});
```

## 🎯 Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- Define explicit types for all functions and variables
- Use interfaces for complex object types
- Avoid `any` type unless absolutely necessary

### React Components
- Use functional components with hooks
- Follow naming conventions: PascalCase for components
- Use TypeScript interfaces for props
- Implement proper error boundaries

### File Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
│   ├── ui/          # Basic UI components
│   ├── game/        # Game-specific components
│   └── arena/       # Arena map components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── types/           # TypeScript type definitions
└── utils/           # Helper utilities
```

### Naming Conventions
- Files: kebab-case (`game-engine.ts`)
- Components: PascalCase (`GameEngine.tsx`)
- Functions: camelCase (`calculateScore`)
- Constants: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- CSS classes: kebab-case (`game-board`)

## 🎮 Gaming Features Guidelines

### Game Development
- Use Phaser 3 for game engine functionality
- Implement mobile-friendly controls
- Ensure cross-platform compatibility
- Follow Indian gaming regulations

### Real-Money Features
- Implement secure payment processing
- Add proper audit trails
- Include transaction logging
- Ensure compliance with local laws

### OTP System
- Support both SMS and Email verification
- Implement proper rate limiting
- Add security measures against abuse
- Maintain user privacy

## 🐛 Bug Reports

Great bug reports are extremely helpful! Guidelines:

### Before Submitting
- Check if the bug has already been reported
- Try to reproduce the issue consistently
- Test on different devices/browsers

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of the bug.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. iOS]
- Browser [e.g. chrome, safari]
- Version [e.g. 22]
- Device: [e.g. iPhone6, Desktop]

**Additional context**
Any other context about the problem.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Provide clear use cases** for the feature
3. **Consider the scope** - is it a core feature?
4. **Think about implementation** - how would it work?

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Pledge
We are committed to making participation in our project a harassment-free experience for everyone.

### Our Standards
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## 🆘 Getting Help

- **Documentation**: Check the README.md
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: dev@carromarena.com for urgent matters

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mentions in project announcements

Thank you for contributing to Carrom Arena! 🎯