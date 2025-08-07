---
sidebar_position: 1
title: Quick Start
description: Get up and running with Endatix Hub development
---

# Quick Start

Welcome to Endatix Hub development! This guide will help you set up your development environment and start building with the platform.

## Prerequisites

- **Node.js 18+** and npm/yarn
- **Git** for version control
- **Docker** (optional, for containerized development)
- **Basic knowledge of React and TypeScript**

## Choose Your Setup Method

### Option 1: Docker (Recommended for Quick Start)

The fastest way to get started is using Docker:

```bash
# Clone the repository
git clone https://github.com/endatix/endatix-hub.git
cd endatix-hub

# Start all services with Docker Compose
docker-compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: PostgreSQL on localhost:5432

### Option 2: Local Development

For full development capabilities:

```bash
# Clone the repository
git clone https://github.com/endatix/endatix-hub.git
cd endatix-hub

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Edit .env.local with your configuration
# DATABASE_URL=postgresql://username:password@localhost:5432/endatix_hub
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=http://localhost:3000

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Project Structure

```
endatix-hub/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── forms/             # Form management
│   └── api/               # API routes
├── components/            # Reusable UI components
├── features/              # Feature-based organization
│   ├── forms/            # Form-related features
│   ├── submissions/      # Submission features
│   └── auth/             # Authentication features
├── lib/                  # Utility functions and configurations
├── types/                # TypeScript type definitions
└── docs/                 # Documentation
```

## Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Prisma**: Database ORM
- **NextAuth.js**: Authentication
- **SurveyJS**: Form builder library

## Development Workflow

### 1. Understanding the Architecture

Endatix Hub follows a modern web architecture:

- **Frontend**: Next.js with React components
- **Backend**: API routes within Next.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with multiple providers
- **File Storage**: AWS S3 or compatible storage

### 2. Creating Custom Components

```typescript
// Example: Custom question type component
import React from 'react';
import { QuestionType } from '@/types';

interface CustomQuestionProps {
  question: QuestionType;
  value: any;
  onChange: (value: any) => void;
}

export const CustomQuestion: React.FC<CustomQuestionProps> = ({
  question,
  value,
  onChange
}) => {
  return (
    <div className="custom-question p-4 border rounded-lg">
      <label className="block text-sm font-medium mb-2">
        {question.title}
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border rounded-md"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
```

### 3. Working with the API

```typescript
// Example: API route for forms
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const forms = await prisma.form.findMany({
      include: {
        submissions: true,
      },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const form = await prisma.form.create({
      data: {
        title: body.title,
        schema: body.schema,
        settings: body.settings,
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
```

### 4. Database Operations

```typescript
// Example: Database operations with Prisma
import { prisma } from '@/lib/prisma';

// Create a form
const form = await prisma.form.create({
  data: {
    title: 'Customer Feedback',
    schema: { /* SurveyJS schema */ },
    settings: { showProgressBar: true },
    userId: 'user-123',
  },
});

// Get form with submissions
const formWithSubmissions = await prisma.form.findUnique({
  where: { id: 'form-123' },
  include: {
    submissions: {
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});
```

## Testing Your Setup

### 1. Check the Application

1. Navigate to http://localhost:3000
2. You should see the Endatix Hub login page
3. Create an account or log in with existing credentials

### 2. Create Your First Form

1. Click "Create New Form" in the dashboard
2. Add some questions using the form builder
3. Publish the form and test it

### 3. Test API Endpoints

```bash
# Test the API
curl http://localhost:3000/api/forms

# Create a form
curl -X POST http://localhost:3000/api/forms \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Form","schema":{"pages":[]}}'
```

## Common Development Tasks

### Adding New Features

1. Create feature directory in `features/`
2. Add components in `features/[feature]/ui/`
3. Add server actions in `features/[feature]/application/`
4. Update types in `types/`
5. Add tests in `__tests__/`

### Customizing the UI

1. Modify components in `components/`
2. Update styles in `app/globals.css`
3. Customize Tailwind config in `tailwind.config.ts`
4. Add new UI components as needed

### Database Changes

1. Create migration: `npm run db:migrate:create`
2. Apply migration: `npm run db:migrate`
3. Update Prisma schema in `prisma/schema.prisma`
4. Regenerate client: `npm run db:generate`

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database connection issues:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql
```

**Environment variables:**
- Ensure `.env.local` is properly configured
- Check that all required variables are set
- Restart the development server after changes

## Getting Help

- **Documentation**: Browse the guides in this documentation
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our developer community
- **Support**: Contact our technical support team
