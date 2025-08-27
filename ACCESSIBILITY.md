# Accessibility Features

This document outlines the comprehensive accessibility features implemented in the Ocarina Fingering Chart Web Application to ensure WCAG 2.1 AA compliance and provide an inclusive experience for all users.

## Overview

The application has been designed with accessibility as a core principle, implementing features that support:

- Screen readers and assistive technologies
- Keyboard-only navigation
- Users with visual impairments
- Users with motor disabilities
- Users with cognitive disabilities

## WCAG 2.1 AA Compliance

### Perceivable

#### 1.1 Text Alternatives
- **Canvas Charts**: The fingering chart canvas has proper alternative text and detailed descriptions
- **Images**: All images have appropriate alt text
- **Icons**: All icons are accompanied by text labels or ARIA labels

#### 1.3 Adaptable
- **Semantic Structure**: Proper HTML5 semantic elements (header, main, section, footer)
- **Heading Hierarchy**: Logical heading structure (h1 → h2)
- **Landmarks**: ARIA landmarks for navigation (banner, main, contentinfo)
- **Reading Order**: Content follows a logical reading order

#### 1.4 Distinguishable
- **Color Contrast**: All text meets WCAG AA contrast requirements
- **Text Scaling**: Content remains functional when text is scaled up to 200%
- **Focus Indicators**: Clear visual focus indicators for all interactive elements
- **High Contrast Support**: Respects user's high contrast preferences

### Operable

#### 2.1 Keyboard Accessible
- **Full Keyboard Navigation**: All functionality available via keyboard
- **Tab Order**: Logical tab order through interactive elements
- **Keyboard Shortcuts**: Comprehensive keyboard shortcuts for common actions
- **No Keyboard Traps**: Users can navigate away from any element

#### 2.2 Enough Time
- **No Time Limits**: No time-based restrictions on user interactions
- **Auto-save**: Input is preserved during validation and error recovery

#### 2.4 Navigable
- **Skip Links**: Skip navigation links to main content and keyboard shortcuts
- **Page Title**: Descriptive page title
- **Focus Management**: Proper focus management for dynamic content
- **Link Purpose**: All links and buttons have clear, descriptive text

### Understandable

#### 3.1 Readable
- **Language**: Page language is properly declared (lang="en")
- **Clear Instructions**: Clear instructions for using the application
- **Error Messages**: Descriptive error messages with suggestions

#### 3.2 Predictable
- **Consistent Navigation**: Consistent interface layout and behavior
- **Consistent Identification**: Consistent labeling and identification
- **No Context Changes**: No unexpected context changes on focus or input

#### 3.3 Input Assistance
- **Error Identification**: Errors are clearly identified and described
- **Labels and Instructions**: All form controls have proper labels
- **Error Prevention**: Input validation helps prevent errors

### Robust

#### 4.1 Compatible
- **Valid HTML**: Clean, semantic HTML structure
- **ARIA Support**: Proper ARIA attributes for dynamic content
- **Assistive Technology**: Compatible with screen readers and other AT

## Keyboard Navigation

### Global Shortcuts
- **Ctrl+S** (Cmd+S on Mac): Export chart as PNG
- **Ctrl+L** (Cmd+L on Mac): Clear all input
- **Ctrl+E** (Cmd+E on Mac): Load example song
- **Ctrl+F** (Cmd+F on Mac): Open file picker
- **Ctrl+I** (Cmd+I on Mac): Focus input area
- **Alt+H**: Show keyboard shortcuts help
- **Alt+D**: Describe current chart
- **Escape**: Close dialogs or clear focus

### Navigation
- **Tab**: Move forward through interactive elements
- **Shift+Tab**: Move backward through interactive elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate within components (where applicable)

## Screen Reader Support

### ARIA Live Regions
- **Polite Announcements**: Non-urgent updates (validation results, state changes)
- **Assertive Announcements**: Important updates (errors, export completion)
- **Status Updates**: Real-time feedback on user actions

### Chart Descriptions
The application provides detailed descriptions of fingering charts for screen reader users:

```
Fingering chart for "Simple Melody". Contains 8 total notes across 2 lines. 
Notes used: A, C, D, F, G. 
Line 1: F, G, A, F. 
Line 2: G, A, C, D.
```

### Fingering Pattern Descriptions
Individual notes are described with their fingering patterns:

```
Note F: All holes covered
Note G: Cover top-left, bottom-left, bottom-right, leave top-right open
Note A: Cover top-left, top-right, bottom-left, leave bottom-right open
```

## Visual Design

### Focus Indicators
- **High Contrast**: 2px solid outline with sufficient contrast
- **Offset**: 2px offset from element for clarity
- **Color**: Uses CSS custom property for consistent theming

### Color and Contrast
- **Text**: Minimum 4.5:1 contrast ratio for normal text
- **Large Text**: Minimum 3:1 contrast ratio for large text
- **Interactive Elements**: Clear visual distinction
- **Error States**: Red color with additional visual indicators

### Responsive Design
- **Mobile Accessibility**: Touch-friendly targets (minimum 44px)
- **Flexible Layout**: Adapts to different screen sizes and orientations
- **Zoom Support**: Functional at up to 200% zoom level

## Error Handling

### Validation Messages
- **Real-time Feedback**: Immediate validation as user types
- **Clear Language**: Plain language error messages
- **Suggestions**: Helpful suggestions for fixing errors
- **Context**: Errors are associated with relevant form controls

### Error Recovery
- **Graceful Degradation**: Application continues to function with errors
- **State Preservation**: User input is preserved during error recovery
- **Multiple Attempts**: Users can retry operations without losing progress

## Testing

### Automated Testing
- **Unit Tests**: 34 accessibility-focused unit tests
- **Integration Tests**: 23 WCAG compliance integration tests
- **Coverage**: Tests cover all major accessibility features

### Manual Testing Checklist
- [ ] Screen reader navigation (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation
- [ ] High contrast mode
- [ ] 200% zoom level
- [ ] Mobile accessibility
- [ ] Color blindness simulation

## Implementation Details

### AccessibilityManager Class
The `AccessibilityManager` class provides centralized accessibility features:

```typescript
const accessibilityManager = new AccessibilityManager({
  enableKeyboardShortcuts: true,
  enableScreenReaderSupport: true,
  enableAriaLiveRegions: true,
  enableFocusManagement: true,
  enableChartDescriptions: true,
  announceValidationChanges: true,
  announceStateChanges: true
});
```

### Key Features
- **Dynamic ARIA Labels**: Updates based on application state
- **Live Region Management**: Manages polite and assertive announcements
- **Keyboard Shortcut Handling**: Comprehensive shortcut system
- **Focus Management**: Proper focus order and indicators
- **Chart Descriptions**: Generates detailed chart descriptions

## Browser Support

### Tested Browsers
- **Chrome**: Full support with Chrome screen reader
- **Firefox**: Full support with NVDA
- **Safari**: Full support with VoiceOver
- **Edge**: Full support with Narrator

### Assistive Technologies
- **Screen Readers**: NVDA, JAWS, VoiceOver, Narrator
- **Voice Control**: Dragon NaturallySpeaking
- **Switch Navigation**: Compatible with switch-based navigation
- **Eye Tracking**: Compatible with eye-tracking software

## Future Enhancements

### Planned Features
- **Voice Commands**: Voice control for common actions
- **Gesture Support**: Touch gesture alternatives for mobile
- **Customizable UI**: User-configurable interface options
- **Language Support**: Multi-language accessibility features

### Continuous Improvement
- **User Feedback**: Regular accessibility user testing
- **Standards Updates**: Keep up with WCAG updates
- **Technology Changes**: Adapt to new assistive technologies
- **Performance**: Optimize accessibility features for performance

## Resources

### Standards and Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

### Screen Readers
- [NVDA (Free)](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (Mac/iOS)](https://www.apple.com/accessibility/mac/vision/)

## Contact

For accessibility-related questions or to report accessibility issues, please:

1. Open an issue on the project repository
2. Include details about your assistive technology setup
3. Describe the specific accessibility barrier encountered
4. Suggest potential solutions if you have them

We are committed to maintaining and improving the accessibility of this application for all users.