# Contributing to Tryhardly

First off, thank you for considering contributing to Tryhardly! It's people like you that make Tryhardly such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if possible**
* **Include your environment details** (OS, browser, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Explain why this enhancement would be useful**
* **List any alternatives you've considered**

### Pull Requests

* Fill in the required template
* Follow the TypeScript styleguide
* Include tests when adding features
* Document new code
* End all files with a newline

## Development Process

### 1. Fork the Repository

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/tryhardly.git
cd tryhardly
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Your Changes

### 5. Test Your Changes

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### 6. Commit Your Changes

```bash
git add .
git commit -m "Add some feature"
```

Follow these commit message guidelines:
* Use present tense ("Add feature" not "Added feature")
* Use imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters
* Reference issues and pull requests after the first line

### 7. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 8. Open a Pull Request

## Style Guides

### TypeScript Style Guide

* Use 2 spaces for indentation
* Use semicolons
* Use single quotes for strings
* Use meaningful variable names
* Add JSDoc comments for functions
* Follow existing code patterns

### Git Commit Messages

* Use the present tense
* Use the imperative mood
* Limit the first line to 72 characters
* Reference issues and PRs liberally

Example:
```
Add gamification engine for XP calculation

- Implement XP calculation logic
- Add level-up system
- Create achievement tracking

Fixes #123
```

## Project Structure

* `frontend/` - Next.js frontend application
* `backend/` - Express.js backend API
* `docs/` - Documentation files

## Testing

* Write tests for all new features
* Ensure all tests pass before submitting PR
* Maintain test coverage above 80%

## Documentation

* Update README.md with any new features
* Add JSDoc comments to all functions
* Update API documentation when changing endpoints

## Community

* Be respectful and inclusive
* Help others when you can
* Follow our Code of Conduct
* Join discussions on GitHub

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing to Tryhardly! ⚔️
