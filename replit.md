# Overview

This is a secure Node.js + Express middleware API that acts as a bridge between a custom GPT and an Airtable base for the LeNDT QMS ISO 9001 system. The application provides a full-stack solution with a React frontend for API documentation and testing, and a backend that offers standardized REST endpoints for all tables in the Airtable base.

The system enables secure CRUD operations on Airtable data through a unified API interface, with proper authentication, error handling, and data validation. The frontend serves as an interactive API explorer and documentation site.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark theme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database Integration**: Drizzle ORM configured for PostgreSQL (though currently using Airtable as primary data source)
- **API Design**: RESTful endpoints with generic table operations (GET, POST, PATCH, DELETE)
- **Middleware**: Custom authentication, error handling, and request logging
- **Development**: Hot reload with Vite integration in development mode

## Authentication & Security
- **API Key Authentication**: Bearer token-based authentication for all API endpoints
- **Environment Variables**: Secure configuration for Airtable credentials and API keys
- **Input Validation**: Zod schemas for request/response validation
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Table Validation**: Prevents access to non-existent tables through metadata API validation

## Data Layer
- **Primary Data Source**: Airtable base via REST API
- **Airtable Integration**: Official Airtable JavaScript library
- **Database Fallback**: Drizzle ORM setup for potential PostgreSQL integration
- **Data Validation**: Shared TypeScript schemas for consistent data structures
- **Pagination**: Automatic handling of Airtable pagination for large datasets

# External Dependencies

## Core Framework Dependencies
- **Express.js**: Web application framework
- **React**: Frontend UI library
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and enhanced developer experience

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library

## Data and State Management
- **TanStack Query**: Server state management and caching
- **Airtable**: Official JavaScript SDK for Airtable API integration
- **Drizzle ORM**: Type-safe SQL ORM for potential database operations
- **Zod**: Runtime type validation and schema definition

## Development and Build Tools
- **TSX**: TypeScript execution for development
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS post-processing with Autoprefixer

## Airtable Integration
- **Service**: Airtable Personal Access Token authentication
- **Base Access**: Read/write operations to LeNDT QMS ISO 9001 base
- **Metadata API**: Dynamic table discovery and validation
- **Rate Limiting**: Built-in respect for Airtable API limits

## Optional Integrations
- **PostgreSQL**: Configured via Neon Database (currently unused)
- **Session Management**: connect-pg-simple for potential session storage
- **Development Plugins**: Replit-specific development enhancements