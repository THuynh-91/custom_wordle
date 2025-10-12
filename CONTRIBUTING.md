# Contributing to AI Wordle Duel

Thank you for your interest in contributing to AI Wordle Duel! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Custom_Wordle.git
   cd Custom_Wordle
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
5. **Prepare word lists**:
   ```bash
   npm run prepare-data
   ```

## Development Workflow

### Running the Development Server

```bash
# Run both frontend and backend
npm run dev

# Run only backend
npm run dev:backend

# Run only frontend
npm run dev:frontend
```

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Run linter before committing:
  ```bash
  npm run lint
  ```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR:
  ```bash
  npm test
  ```
- Aim for good test coverage

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add race mode UI component`
- `fix: Correct duplicate letter handling in feedback`
- `docs: Update API documentation`
- `test: Add tests for entropy solver`
- `refactor: Simplify constraint building logic`

## Areas for Contribution

### 1. Core Features
- Implement additional game modes
- Add multiplayer support
- Create mobile-optimized UI
- Add animations and transitions

### 2. AI Solvers
- Improve existing solvers
- Add new solver strategies
- Optimize performance
- Add RL-based solver

### 3. ML Pipeline
- Enhance training data generation
- Experiment with different model architectures
- Add model evaluation tools
- Implement online learning

### 4. Word Lists
- Add support for more languages
- Curate better word lists
- Add word difficulty ratings
- Filter inappropriate words

### 5. UI/UX
- Improve accessibility
- Add themes and customization
- Create better mobile experience
- Add sound effects and haptics

### 6. Infrastructure
- Add Redis caching
- Implement PostgreSQL for persistence
- Add user authentication
- Deploy to cloud platforms

## Pull Request Process

1. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test thoroughly**:
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - List any breaking changes

7. **Address review feedback**:
   - Make requested changes
   - Push new commits to your branch
   - Respond to reviewer comments

## Code Review Guidelines

When reviewing code:
- Be constructive and respectful
- Focus on code quality and maintainability
- Check for potential bugs and edge cases
- Verify tests are adequate
- Ensure documentation is updated

## Bug Reports

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (browser, OS, etc.)

## Feature Requests

When suggesting features:
- Describe the problem it solves
- Explain proposed solution
- Consider implementation complexity
- Discuss potential alternatives

## Questions?

- Open an issue for general questions
- Check existing issues and discussions first
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions help make AI Wordle Duel better for everyone. We appreciate your time and effort!
