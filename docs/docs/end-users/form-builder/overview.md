---
sidebar_position: 1
title: Form Builder Overview
description: Learn how to create and customize forms using the Endatix Hub form builder
---

# Form Builder Overview

The Endatix Hub form builder is built on top of SurveyJS, providing you with a powerful, intuitive interface to create professional forms without any coding knowledge.

## Getting Started

### Accessing the Form Builder
1. Log in to your Endatix Hub instance
2. Navigate to the **Forms** section in the main menu
3. Click **"Create New Form"** to start building

### Form Builder Interface

The form builder consists of several key areas:

- **Toolbox**: Contains all available question types and elements
- **Design Surface**: The main area where you design your form
- **Properties Panel**: Configure settings for selected elements
- **Preview**: Test your form as users will see it

## Question Types

Endatix Hub provides 20+ question types to meet any form requirement:

### Basic Input Types
- **Text**: Single line text input
- **Comment**: Multi-line text area
- **Email**: Email address input with validation
- **Number**: Numeric input with range validation
- **Date**: Date picker with calendar interface

### Choice Types
- **Radio Group**: Single selection from multiple options
- **Checkbox Group**: Multiple selections from options
- **Dropdown**: Single selection from dropdown list
- **Rating**: Star or numeric rating system
- **Boolean**: Yes/No or True/False questions

### Advanced Types
- **Matrix**: Grid-style questions with rows and columns
- **File Upload**: File attachment with size and type restrictions
- **Signature**: Digital signature capture
- **Image**: Image display with optional selection
- **HTML**: Custom HTML content

### Custom Types
- **Address**: Structured address input
- **Phone**: Phone number with formatting
- **Credit Card**: Secure payment information
- **Barcode**: Barcode/QR code scanning
- **GPS**: Location capture

## Building Your First Form

### Step 1: Add Questions
1. Drag question types from the toolbox to the design surface
2. Click on any question to select it
3. Use the properties panel to configure the question

### Step 2: Configure Questions
For each question, you can configure:

- **Title**: The question text displayed to users
- **Description**: Additional help text or instructions
- **Required**: Whether the question is mandatory
- **Validation**: Custom validation rules
- **Default Value**: Pre-filled answer
- **Visibility**: Conditional display logic

### Step 3: Organize Your Form
- **Pages**: Split long forms into multiple pages
- **Panels**: Group related questions together
- **Sections**: Create visual separations
- **Logic**: Add conditional logic between questions

### Step 4: Style Your Form
- **Theme**: Choose from pre-built themes
- **Colors**: Customize brand colors
- **Typography**: Adjust fonts and text styling
- **Layout**: Configure spacing and alignment

## Advanced Features

### Conditional Logic
Show or hide questions based on previous answers:

```javascript
// Example: Show follow-up question only if user selects "Yes"
{
  "type": "radiogroup",
  "name": "hasExperience",
  "title": "Do you have experience with this topic?",
  "choices": ["Yes", "No"]
},
{
  "type": "text",
  "name": "experienceDetails",
  "title": "Please describe your experience",
  "visibleIf": "{hasExperience} = 'Yes'"
}
```

### Validation Rules
Add custom validation to ensure data quality:

- **Required fields**: Ensure critical information is collected
- **Format validation**: Email, phone, date formats
- **Range validation**: Numeric limits and constraints
- **Custom validation**: JavaScript-based custom rules

### Multi-language Support
Create forms in multiple languages:

1. Enable multi-language in form settings
2. Add translations for all question text
3. Set default language and fallback options
4. Users can switch languages during form completion

## Best Practices

### Form Design
- **Keep it simple**: Don't overwhelm users with too many questions
- **Logical flow**: Organize questions in a logical sequence
- **Clear instructions**: Provide helpful guidance where needed
- **Mobile-friendly**: Test your form on mobile devices

### User Experience
- **Progress indicators**: Show completion progress for long forms
- **Save and resume**: Allow users to save progress
- **Clear navigation**: Easy-to-understand navigation controls
- **Responsive design**: Works well on all device sizes

### Data Quality
- **Required fields**: Only make truly necessary fields required
- **Validation**: Use appropriate validation for each field type
- **Clear labels**: Make question intent obvious
- **Help text**: Provide context where helpful

## Preview and Testing

### Preview Mode
- Test your form exactly as users will see it
- Fill out the form to test the user experience
- Verify all conditional logic works correctly
- Check mobile responsiveness

### Testing Checklist
- [ ] All questions display correctly
- [ ] Conditional logic works as expected
- [ ] Validation rules function properly
- [ ] Form submits successfully
- [ ] Mobile experience is good
- [ ] Required fields are clearly marked

## Publishing Your Form

### Before Publishing
1. **Test thoroughly**: Complete the form multiple times
2. **Review content**: Check all text for typos and clarity
3. **Verify settings**: Ensure all configurations are correct
4. **Check integrations**: Test any webhooks or integrations

### Publishing Options
- **Public URL**: Share a direct link to your form
- **Embed Code**: Add the form to your website
- **QR Code**: Generate a QR code for mobile access
- **Email Link**: Send the form link via email

### Post-Publishing
- **Monitor submissions**: Track form completion rates
- **Gather feedback**: Collect user feedback for improvements
- **Analyze data**: Review submission patterns and trends
- **Iterate**: Make improvements based on usage data