import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, ListChecks, Users, CreditCard } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background text-foreground">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-8 md:px-20 text-center space-y-8">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold">
            Welcome to
            <span className="text-blue-600"> RentMate</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl md:text-2xl text-muted-foreground">
            Simplify shared living. Effortlessly manage roommate chores and expenses for a harmonious home.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">
              Login to Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/signup">
              Create New Account
            </Link>
          </Button>
        </div>

        {/* Features Section */}
        <section className="w-full max-w-5xl py-12 md:py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 md:mb-12">
            Why Choose RentMate?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <ListChecks className="h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Effortless Chore Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Assign, track, and manage household chores with ease. No more arguments over who did what!
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Transparent Expense Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Log shared expenses, see who paid, and how it's split. Settle up fairly and without confusion.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <CardTitle className="text-xl">Harmonious Co-living</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Reduce friction and improve communication with your roommates for a happier home.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      {/* Footer removed as it's now global */}
    </div>
  );
}
