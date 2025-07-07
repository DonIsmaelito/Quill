# Quill EHR - Modern Healthcare Management System

A comprehensive Electronic Health Record (EHR) system built with React, TypeScript, and Supabase, designed for modern healthcare practices.

## Features

- **Patient Management**: Complete patient profiles with medical history and demographics
- **Clinical Records**: Comprehensive medical records including conditions, medications, and measurements
- **Appointment Scheduling**: Efficient appointment management with automated reminders
- **Vital Signs Tracking**: Real-time monitoring of patient health metrics
- **Document Management**: Secure storage of medical documents and forms
- **Secure Communication**: HIPAA-compliant messaging for healthcare teams
- **Role-Based Access**: Different interfaces for patients, providers, and administrators

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Form Handling**: React Hook Form, Zod validation
- **State Management**: React Context, TanStack Query
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mockups/frontend2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and anon key

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

5. **Set up the database schema**
   - Use the schema definitions from `src/mock_ehr/schema_definitions.py`
   - Create the tables in your Supabase database using the SQL editor
   - Enable Row Level Security (RLS) for data protection

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173`

## Database Schema

The system uses an OMOP CDM-inspired schema with the following main tables:

- **person**: Patient demographics and basic information
- **person_address**: Patient addresses (home, work, billing)
- **person_contact**: Contact information (phone, email)
- **condition_occurrence**: Medical conditions and diagnoses
- **drug_exposure**: Medications and prescriptions
- **measurement**: Lab results and vital signs
- **visit_occurrence**: Patient visits and appointments
- **provider**: Healthcare providers and staff
- **care_site**: Healthcare facilities and locations

## Authentication

The system supports three user roles:

- **Patient**: Access to personal health records and appointment scheduling
- **Provider**: Full access to patient records and clinical tools
- **Admin**: System administration and practice management

## Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables**
   - Add your Supabase environment variables in the Vercel dashboard
   - Set `SUPABASE_URL` and `SUPABASE_KEY`

### Environment Variables

Make sure to set these environment variables in your deployment platform:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anonymous key

## Security Features

- **HIPAA Compliance**: Built-in security measures for healthcare data
- **Row Level Security**: Database-level access control
- **Encrypted Data**: All sensitive data is encrypted
- **Audit Trail**: Complete logging of data access and changes
- **Role-Based Access**: Granular permissions based on user roles

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API and external service integrations
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
