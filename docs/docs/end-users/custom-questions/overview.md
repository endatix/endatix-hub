---
sidebar_position: 1
title: Custom Questions
description: Create custom question types for your forms
---

# Custom Questions

Build reusable custom question types to enhance your forms.

## What are Custom Questions?

Custom questions are reusable form elements that you can create and save for future use. They help you:

- **Save time** by reusing common question patterns
- **Maintain consistency** across your forms
- **Add advanced functionality** not available in standard questions
- **Brand your forms** with custom styling

## Creating Custom Questions

### Step 1: Access the Custom Question Builder

1. Navigate to **Forms** → **Custom Questions**
2. Click **"Create New Question Type"**
3. Choose a template or start from scratch

### Step 2: Configure Your Question

#### Basic Settings
- **Name**: Give your question type a descriptive name
- **Description**: Explain what this question type does
- **Category**: Organize your questions (e.g., "Contact Info", "Business")

#### Question Properties
- **Input Type**: Text, number, email, phone, etc.
- **Validation Rules**: Required fields, format validation, etc.
- **Default Value**: Pre-filled answer (optional)
- **Help Text**: Instructions for users

#### Advanced Settings
- **Conditional Logic**: Show/hide based on other answers
- **Custom Styling**: Match your brand colors
- **Integration**: Connect with external systems

### Step 3: Test and Save

1. **Preview** your question type
2. **Test** the functionality
3. **Save** for future use

## Question Type Examples

### Contact Information

```json
{
  "name": "Contact Info",
  "type": "composite",
  "properties": {
    "firstName": {
      "type": "text",
      "label": "First Name",
      "required": true
    },
    "lastName": {
      "type": "text", 
      "label": "Last Name",
      "required": true
    },
    "email": {
      "type": "email",
      "label": "Email Address",
      "required": true
    },
    "phone": {
      "type": "tel",
      "label": "Phone Number",
      "required": false
    }
  }
}
```

### Address Block

```json
{
  "name": "Address",
  "type": "composite",
  "properties": {
    "street": {
      "type": "text",
      "label": "Street Address",
      "required": true
    },
    "city": {
      "type": "text",
      "label": "City",
      "required": true
    },
    "state": {
      "type": "dropdown",
      "label": "State",
      "options": ["CA", "NY", "TX", "FL"],
      "required": true
    },
    "zipCode": {
      "type": "text",
      "label": "ZIP Code",
      "pattern": "^\\d{5}(-\\d{4})?$",
      "required": true
    }
  }
}
```

### Rating Scale

```json
{
  "name": "Satisfaction Rating",
  "type": "rating",
  "properties": {
    "minValue": 1,
    "maxValue": 5,
    "labels": {
      "1": "Very Dissatisfied",
      "2": "Dissatisfied", 
      "3": "Neutral",
      "4": "Satisfied",
      "5": "Very Satisfied"
    },
    "required": true
  }
}
```

## Using Custom Questions

### Adding to Forms

1. Open the **Form Builder**
2. Drag your custom question from the toolbox
3. Configure the specific instance settings
4. Test the question in your form

### Managing Custom Questions

#### Edit Existing Questions
1. Go to **Custom Questions**
2. Find the question you want to edit
3. Click **"Edit"**
4. Make your changes
5. **Save** the updates

#### Delete Questions
1. Select the question to delete
2. Click **"Delete"**
3. Confirm the deletion

:::warning
Deleting a custom question will remove it from all forms that use it.
:::

## Advanced Features

### Conditional Logic

Show or hide custom questions based on other answers:

```json
{
  "condition": {
    "field": "hasExperience",
    "operator": "equals",
    "value": "Yes"
  }
}
```

### Custom Validation

Add custom validation rules:

```json
{
  "validation": {
    "required": true,
    "minLength": 3,
    "maxLength": 50,
    "pattern": "^[a-zA-Z\\s]+$",
    "customMessage": "Please enter a valid name"
  }
}
```

### Integration Hooks

Connect custom questions to external systems:

```json
{
  "integration": {
    "type": "webhook",
    "url": "https://your-api.com/validate",
    "trigger": "onChange"
  }
}
```

## Best Practices

### Naming Conventions

- Use **descriptive names**: "Customer Contact Info" vs "Contact"
- Include **category prefixes**: "Business-Address", "Personal-Phone"
- Keep names **consistent**: Use similar patterns across questions

### Organization

- **Group related questions**: Contact info, business details, etc.
- **Use categories**: Organize by form type or business function
- **Version control**: Keep track of question updates

### Testing

- **Test thoroughly**: Try all possible inputs
- **Validate edge cases**: Empty values, special characters, etc.
- **Check mobile**: Ensure questions work on mobile devices

## Troubleshooting

### Common Issues

**Question not appearing in form builder**
- Check if the question is published
- Verify you have the correct permissions
- Try refreshing the form builder

**Validation not working**
- Check the validation rules syntax
- Test with different input values
- Review the browser console for errors

**Styling issues**
- Verify CSS classes are correct
- Check for conflicting styles
- Test in different browsers

### Getting Help

- **Documentation**: Check the help guides
- **Support**: Contact technical support
- **Community**: Ask other users in the forum
