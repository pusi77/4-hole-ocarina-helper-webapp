# Comprehensive Test Suite

This directory contains a comprehensive test suite for the Ocarina Chart Web Application, covering all aspects of functionality, performance, accessibility, and visual consistency.

## Test Structure

### Core Test Categories

1. **Unit Tests** (`src/core/__tests__/`, `src/ui/__tests__/`, `src/renderer/__tests__/`)
   - Test individual components in isolation
   - Verify core logic and functionality
   - Ensure proper error handling

2. **Integration Tests** (`src/__tests__/integration/`)
   - Test complete user workflows
   - Verify component interactions
   - Test end-to-end scenarios

3. **Performance Tests** (`src/__tests__/performance/`)
   - Loading time validation (< 2 seconds)
   - Real-time update performance (< 16ms)
   - Memory usage monitoring
   - Bundle size verification (< 500KB)

4. **Visual Regression Tests** (`src/__tests__/visual/`)
   - Chart rendering accuracy
   - Layout consistency
   - Responsive design validation
   - High-DPI support

5. **Accessibility Tests** (`src/__tests__/accessibility/`)
   - WCAG compliance validation
   - Screen reader support
   - Keyboard navigation
   - Color contrast verification

## Requirements Coverage

### Performance Requirements (9.1, 9.2, 9.4)

- ✅ Initial loading under 2 seconds
- ✅ Responsive real-time preview updates
- ✅ Efficient memory management
- ✅ Bundle size under 500KB

### Accessibility Requirements (10.1, 10.2, 10.3, 10.4)

- ✅ ARIA labels and descriptions
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Color contrast compliance

## Running Tests

### All Tests

```bash
npm run test:run
```

### Specific Test Categories

```bash
npm run test:performance     # Performance tests only
npm run test:integration     # Integration tests only
npm run test:visual         # Visual regression tests only
npm run test:accessibility  # Accessibility tests only
```

### Coverage Report

```bash
npm run test:coverage
```

### Continuous Integration

```bash
npm run test:ci
```

### Watch Mode (Development)

```bash
npm run test:watch
```

## Test Configuration

### Coverage Thresholds

- Statements: 90%
- Branches: 85%
- Functions: 95%
- Lines: 90%

### Performance Benchmarks

- Initial load: < 2000ms
- Real-time updates: < 16ms (60fps)
- Memory usage: < 100MB
- Bundle size: < 500KB

### Accessibility Standards

- WCAG 2.1 AA compliance
- Color contrast ratio: 4.5:1 (normal text), 3:1 (large text)
- Keyboard navigation support
- Screen reader compatibility

## Test Utilities

### Global Test Utilities (`testUtils`)

- `createMockElement()` - Create mock DOM elements
- `createMockCanvas()` - Create mock canvas elements
- `createMockFile()` - Create mock file objects
- `waitFor()` - Wait for async conditions
- `mockTimers()` / `restoreTimers()` - Timer control

### Mock Setup

The test suite includes comprehensive mocking for:

- Canvas API
- File API (FileReader, Blob, URL)
- DOM methods
- Performance API
- ResizeObserver / IntersectionObserver
- matchMedia

## Test Organization

### File Naming Conventions

- `*.test.ts` - Standard test files
- `*.bench.ts` - Performance benchmark tests
- `*.a11y.ts` - Accessibility-specific tests
- `*.visual.ts` - Visual regression tests

### Test Structure

Each test file follows this structure:

1. Imports and setup
2. Mock configuration
3. Test suites organized by functionality
4. Cleanup and teardown

## Continuous Integration

### GitHub Actions Integration

The test suite is designed to work with CI/CD pipelines:

- Headless browser support
- Machine-readable output formats
- Parallel test execution
- Coverage reporting

### Test Reports

Generated reports include:

- Test results (JSON/HTML)
- Coverage reports
- Performance metrics
- Accessibility audit results

## Maintenance

### Adding New Tests

1. Follow existing naming conventions
2. Use appropriate test category
3. Include proper mocking
4. Add coverage for new features
5. Update this documentation

### Test Quality Guidelines

- Tests should be isolated and independent
- Use descriptive test names
- Include meaningful assertions
- Mock external dependencies
- Clean up after tests

### Performance Considerations

- Keep test execution time reasonable
- Use efficient mocking strategies
- Avoid unnecessary DOM manipulation
- Clean up resources properly

## Troubleshooting

### Common Issues

1. **Canvas tests failing**: Ensure canvas mocking is properly set up
2. **File upload tests failing**: Check FileReader mock configuration
3. **Accessibility tests failing**: Verify ARIA attribute mocking
4. **Performance tests inconsistent**: Use consistent timing mocks

### Debug Mode

Run tests with additional logging:

```bash
DEBUG=true npm run test:run
```

### Test Isolation

If tests are interfering with each other:

```bash
npm run test:run -- --no-coverage --reporter=verbose
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all test categories are covered
3. Update performance benchmarks if needed
4. Add accessibility tests for UI changes
5. Update visual regression tests for rendering changes

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Canvas API Testing](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Accessibility Testing Guide](https://web.dev/accessibility/)
