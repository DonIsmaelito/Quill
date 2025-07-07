import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Shield, 
  Users, 
  FileText, 
  Lock, 
  ArrowRight,
  Stethoscope,
  Activity,
  Calendar,
  MessageSquare
} from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Quill EHR</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Shield className="w-4 h-4 mr-2" />
            HIPAA Compliant
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Modern Healthcare
            <span className="text-blue-600 dark:text-blue-400"> Management</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Streamline patient care with our intelligent EHR system. Secure, efficient, and designed for the future of healthcare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need for modern healthcare
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Comprehensive tools designed to enhance patient care and streamline administrative tasks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>
                Complete patient profiles with medical history, demographics, and contact information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Clinical Records</CardTitle>
              <CardDescription>
                Comprehensive medical records including conditions, medications, and measurements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Appointment Scheduling</CardTitle>
              <CardDescription>
                Efficient appointment management with automated reminders and scheduling.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Vital Signs Tracking</CardTitle>
              <CardDescription>
                Real-time monitoring and tracking of patient vital signs and health metrics.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Secure storage and management of medical documents, forms, and reports.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Secure Communication</CardTitle>
              <CardDescription>
                HIPAA-compliant messaging and communication tools for healthcare teams.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Your patient data is protected with the highest level of security standards.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">HIPAA Compliant</h3>
                <p className="text-gray-600 dark:text-gray-300">Full compliance with healthcare privacy regulations</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">End-to-End Encryption</h3>
                <p className="text-gray-600 dark:text-gray-300">All data encrypted in transit and at rest</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Audit Trail</h3>
                <p className="text-gray-600 dark:text-gray-300">Complete tracking of all data access and changes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to transform your healthcare practice?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of healthcare providers who trust Quill EHR for their patient care needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/signin">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">Quill EHR</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Modern healthcare management for the digital age.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li><a href="#" className="hover:text-blue-600">Features</a></li>
                <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600">Security</a></li>
                <li><a href="#" className="hover:text-blue-600">Compliance</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li><a href="#" className="hover:text-blue-600">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-600">Training</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li><a href="#" className="hover:text-blue-600">About</a></li>
                <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
                <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center text-gray-600 dark:text-gray-300">
            <p>&copy; 2024 Quill EHR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 