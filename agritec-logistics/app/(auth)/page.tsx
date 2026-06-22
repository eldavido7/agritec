'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Zap, Truck, BarChart3, Shield, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  const features = [
    {
      icon: Truck,
      title: 'Real-time Delivery Tracking',
      description: 'Monitor your agricultural shipments with status-based tracking and detailed delivery history.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Get comprehensive insights into your delivery performance and revenue trends.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security for all your logistics data and transactions.',
    },
    {
      icon: Clock,
      title: 'Efficient Operations',
      description: 'Streamline your logistics workflow with intuitive management tools.',
    },
    {
      icon: MapPin,
      title: 'Coverage Management',
      description: 'Easily manage your delivery coverage areas and pricing tiers.',
    },
    {
      icon: Zap,
      title: 'Fast Integration',
      description: 'Seamlessly integrate with your existing agricultural marketplace.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="AgriTec" width={120} height={40} className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-foreground hover:text-primary transition">
              Features
            </Link>
            <Link href="/signin" className="text-sm font-medium text-foreground hover:text-primary transition">
              Sign In
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center space-y-8"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
                Logistics Made Simple
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The complete logistics management platform for agricultural marketplaces. Track deliveries, manage operations, and grow your business.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Sign In
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-8">
              <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="AgriTec Dashboard"
                  width={600}
                  height={400}
                  className="w-full rounded-lg"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.h2 variants={itemVariants} className="text-4xl font-bold text-foreground mb-4">
              Powerful Features
            </motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your agricultural logistics efficiently
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="bg-background p-8 rounded-lg border border-border hover:border-primary/50 transition"
                >
                  <Icon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">Ready to Transform Your Logistics?</h2>
              <p className="text-lg text-muted-foreground">
                Join hundreds of agricultural businesses using AgriTec to streamline their operations
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                  Get Started Now
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 AgriTec. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
