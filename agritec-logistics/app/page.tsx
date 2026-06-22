"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Manage Assigned Deliveries",
    description:
      "View every AgriTec marketplace delivery assigned to your logistics company, track order groups, and keep buyers, sellers, and admins updated from one dashboard.",
  },
  {
    title: "Update Delivery Statuses",
    description:
      "Move deliveries through the fulfillment journey with clear status updates, optional delivery notes, and automatic buyer notifications.",
  },
  {
    title: "Set Pricing and Coverage",
    description:
      "Configure your delivery pricing, choose nationwide or regional coverage, and define the states, LGAs, and cities your company serves.",
  },
];

const workflow = [
  "Register your logistics company.",
  "Wait for AgriTec admin verification.",
  "Set your pricing and delivery coverage.",
  "Receive assigned marketplace deliveries.",
  "Update delivery progress until completion or cancellation.",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 text-center">
          <Image
            src="/logo.png"
            alt="AgriTec"
            width={180}
            height={60}
            className="h-14 w-auto"
          />

          <div className="max-w-3xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Logistics Partner Dashboard
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Deliver agricultural orders across the AgriTec marketplace
            </h1>

            <p className="text-lg leading-8 text-muted-foreground">
              AgriTec Logistics helps verified delivery companies manage
              marketplace deliveries, regional coverage, shipping prices, and
              delivery status updates for buyer orders.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/signin">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline">
                Register Company
              </Button>
            </Link>
          </div>

          <div className="grid w-full gap-4 text-left md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-card-foreground">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              From verification to completed delivery
            </h2>
            <p className="mt-4 text-muted-foreground">
              Logistics companies are reviewed before they can access the
              dashboard. Once verified, your company can manage coverage,
              receive eligible orders, and update delivery progress directly.
            </p>
          </div>

          <div className="space-y-3">
            {workflow.map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-xl border bg-background p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm font-medium text-foreground">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl rounded-3xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-card-foreground">
            Built for verified logistics companies
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            New companies can register, but dashboard access only becomes
            available after AgriTec admin approval. This protects buyers,
            sellers, and marketplace deliveries.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">Register Company</Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline">
                Already Verified? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
