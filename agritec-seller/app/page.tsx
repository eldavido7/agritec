"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const walletRef = useRef<HTMLDivElement>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Intersection Observer for scroll fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((el) => {
          if (el.isIntersecting) {
            el.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    const fadeElements = document.querySelectorAll(".fade-in-section");
    fadeElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Number counter animation for the wallet balance
  useEffect(() => {
    let walletAnimated = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((el) => {
          if (el.isIntersecting && !walletAnimated) {
            walletAnimated = true;
            animateNumber(0, 312450, 1400);
          }
        });
      },
      { threshold: 0.5 },
    );

    if (walletRef.current) observer.observe(walletRef.current);

    function animateNumber(start: number, end: number, duration: number) {
      const startTime = performance.now();
      function update(now: number) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.round(start + (end - start) * ease);
        setWalletBalance(val);
        if (t < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }

    return () => observer.disconnect();
  }, []);

  const faqs = [
    {
      q: "Is it free to open a seller account?",
      a: "Yes, creating your AgriTec seller account is completely free. You only pay a small commission (starting at 3%) when you successfully complete a sale. No monthly fees, no setup charges.",
    },
    {
      q: "How do I receive payments from buyers?",
      a: "When a buyer places an order, their payment is held securely in escrow. Once you confirm delivery, the funds are released instantly to your seller wallet. From there, you can withdraw to any Nigerian bank account or mobile money wallet.",
    },
    {
      q: "What products can I sell on AgriTec?",
      a: "You can sell any agricultural product — grains (rice, maize, millet), vegetables, fruits, livestock products (eggs, poultry, dairy), processed foods (groundnut oil, palm oil), seeds, fertilizers, and farming equipment.",
    },
    {
      q: "Do I need a smartphone or laptop to use AgriTec?",
      a: "AgriTec works on any smartphone (Android or iPhone), tablet, or computer. The mobile app is optimized for low-bandwidth connections so it works even in areas with slower internet.",
    },
    {
      q: "How quickly can I start selling after signing up?",
      a: "Most sellers are live within 10 minutes. Sign up, verify your phone number, create your store profile, and upload your first products. Your listing goes live immediately and buyers can find you on the marketplace.",
    },
  ];

  return (
    <>
      {/* Custom keyframes for animations not built into standard Tailwind.
        We inject these globally just for this page's specific flourishes.
      */}
      <style jsx global>{`
        .fade-in-section {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.6s ease-out,
            transform 0.6s ease-out;
        }
        .fade-in-section.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes custom-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-custom-float {
          animation: custom-float 4s ease-in-out infinite;
        }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 md:px-12 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex max-w-[1350px] mx-auto w-full items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-foreground"
        >
          {/* <div className="w-8 h-8 flex items-center justify-center bg-[#639922] rounded-lg"> */}
          <Image
            src="/logo.png"
            alt="AgriTec Logo"
            width={160}
            height={160}
            className="object-contain"
          />
          {/* </div> */}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="#features"
            className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how"
            className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/auth/signin"
            className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#639922] hover:bg-[#4b7519] text-white text-sm font-medium rounded-md transition-all active:scale-95"
          >
            Start Selling
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          </div>
          </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen md:pt-32 pb-20 px-4 md:px-12 flex items-center overflow-hidden">
        {/* Subtle background gradients */}
        <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20">
          <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-[#97C459] blur-[120px] rounded-full opacity-30"></div>
          <div className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-[#FAC775] blur-[120px] rounded-full opacity-20"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="fade-in-section">
            <div className="inline-flex items-center gap-2 bg-[#EAF3DE] dark:bg-[#639922]/10 border border-[#C0DD97] dark:border-[#639922]/30 text-[#27500A] dark:text-[#97C459] rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <div className="w-2 h-2 rounded-full bg-[#639922] animate-pulse"></div>
              Nigeria's #1 Agricultural Marketplace
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight mb-6">
              Your Farm.
              <br />
              Your <span className="text-[#639922]">Store.</span>
              <br />
              <span className="text-[#BA7517]">More Buyers.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-md leading-relaxed">
              Open your digital farm store in minutes. List products, receive
              orders, chat with buyers, and withdraw your earnings — all from
              one powerful seller dashboard.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#639922] hover:bg-[#4b7519] text-white text-base font-medium rounded-xl transition-all active:scale-95"
              >
                Open Your Store Free
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-border hover:border-[#639922] hover:bg-muted text-foreground text-base font-medium rounded-xl transition-all"
              >
                See How It Works
              </Link>
            </div>

            <div className="flex gap-8 mt-12 pt-8 border-t border-border">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  18,400+
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Active Sellers
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">₦2.1B+</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Paid to Farmers
                </div>
              </div>
              <div className="block">
                <div className="text-2xl font-bold text-foreground">340k+</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Verified Buyers
                </div>
              </div>
            </div>
          </div>

          <div className="relative fade-in-section delay-200 block">
            {/* Dashboard Mockup */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl dark:shadow-none">
              <div className="bg-muted border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-muted-foreground ml-2 uppercase tracking-wider">
                  Seller Dashboard
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-muted rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Revenue
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      ₦847k
                    </div>
                    <div className="text-[10px] text-[#639922]">
                      ↑ 18% this month
                    </div>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Orders
                    </div>
                    <div className="text-lg font-bold text-foreground">142</div>
                    <div className="text-[10px] text-[#639922]">
                      ↑ 9 pending
                    </div>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Wallet
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      ₦312k
                    </div>
                    <div className="text-[10px] text-[#639922]">
                      Ready to withdraw
                    </div>
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-3 mb-4 h-24 relative overflow-hidden flex items-end">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 320 70"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#639922"
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor="#639922"
                          stopOpacity="0.02"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 60 L40 52 L80 44 L110 48 L140 36 L170 28 L200 32 L230 20 L260 14 L290 8 L320 6 L320 70 L0 70 Z"
                      fill="url(#chartGrad)"
                    />
                    <path
                      d="M0 60 L40 52 L80 44 L110 48 L140 36 L170 28 L200 32 L230 20 L260 14 L290 8 L320 6"
                      fill="none"
                      stroke="#639922"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    Recent Orders
                  </div>
                  {[
                    {
                      init: "AO",
                      bg: "bg-[#FAEEDA]",
                      text: "text-[#854F0B]",
                      name: "Adebayo Ogunwale",
                      item: "50kg Premium Rice",
                      amt: "₦42,500",
                      badge: "bg-[#EAF3DE] text-[#27500A]",
                      status: "Paid",
                    },
                    {
                      init: "CN",
                      bg: "bg-[#E1F5EE]",
                      text: "text-[#085041]",
                      name: "Chidi Nwosu",
                      item: "3 Crates Tomatoes",
                      amt: "₦15,000",
                      badge: "bg-[#FAEEDA] text-[#854F0B]",
                      status: "Pending",
                    },
                    {
                      init: "FA",
                      bg: "bg-[#EAF3DE]",
                      text: "text-[#27500A]",
                      name: "Fatima Abdullahi",
                      item: "20kg Groundnut Oil",
                      amt: "₦28,800",
                      badge: "bg-[#E1F5EE] text-[#085041]",
                      status: "Shipped",
                    },
                  ].map((order, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${order.bg} ${order.text}`}
                      >
                        {order.init}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-foreground">
                          {order.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {order.item}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-foreground">
                        {order.amt}
                      </div>
                      <div
                        className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${order.badge}`}
                      >
                        {order.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-8 bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-3 animate-custom-float">
              <div className="w-10 h-10 rounded-lg bg-[#EAF3DE] dark:bg-[#639922]/20 flex items-center justify-center text-lg">
                🌾
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">
                  New order received
                </div>
                <div className="text-sm font-bold text-foreground">
                  100kg Maize – ₦38k
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-6 bg-card border border-border rounded-xl shadow-lg p-3 flex items-center gap-3 animate-custom-float [animation-delay:-2s]">
              <div className="w-10 h-10 rounded-lg bg-[#FAEEDA] dark:bg-[#BA7517]/20 flex items-center justify-center text-lg">
                💰
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">
                  Payout successful
                </div>
                <div className="text-sm font-bold text-foreground">
                  ₦154,000 → UBA
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-4 md:px-12 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 fade-in-section">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#639922] mb-3">
              Get Started in Minutes
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              How AgriTec Seller Portal Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From registration to your first sale — a streamlined process built
              for Nigerian farmers and agro-vendors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-border rounded-3xl overflow-hidden">
            {[
              {
                num: "01",
                title: "Create Your Seller Account",
                desc: "Sign up free with your phone number, verify your identity, and get your seller profile live in under 5 minutes. No paperwork. No hidden fees.",
                icon: (
                  <svg
                    className="w-6 h-6 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                ),
              },
              {
                num: "02",
                title: "List Your Products",
                desc: "Upload photos, set prices, specify quantities and delivery options. Your products go live on the AgriTec marketplace and are visible to thousands of buyers instantly.",
                icon: (
                  <svg
                    className="w-6 h-6 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ),
              },
              {
                num: "03",
                title: "Sell, Earn & Grow",
                desc: "Receive orders, communicate with buyers, track your sales, and withdraw your earnings to your bank account or mobile wallet — anytime, anywhere.",
                icon: (
                  <svg
                    className="w-6 h-6 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div
                key={i}
                className={`bg-card p-10 hover:bg-muted/50 transition-colors fade-in-section delay-[${i * 100}ms]`}
              >
                <div className="text-5xl font-extrabold text-[#C0DD97] dark:text-[#27500A] leading-none mb-6">
                  {step.num}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#EAF3DE] dark:bg-[#639922]/10 flex items-center justify-center mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 fade-in-section">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#639922] mb-3">
              Seller Tools
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              Everything You Need
              <br />
              to Run Your Farm Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              A complete seller toolkit — from product management to payouts —
              designed for agricultural vendors at every scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Featured tall card */}
            <div className="bg-[#173404] text-white border border-[#27500A] rounded-[1.5rem] p-8 md:row-span-2 relative overflow-hidden flex flex-col justify-end fade-in-section group">
              <div className="absolute top-0 left-0 right-0 h-[55%] bg-gradient-to-b from-[#27500A] to-[#173404] opacity-50 pointer-events-none"></div>

              <div className="relative z-10 mb-8 space-y-2">
                {[
                  {
                    icon: "🌾",
                    name: "Premium White Rice (50kg)",
                    stock: "240 bags",
                    price: "₦42,500",
                  },
                  {
                    icon: "🥜",
                    name: "Groundnut Oil (25L)",
                    stock: "80 kegs",
                    price: "₦18,000",
                  },
                  {
                    icon: "🌽",
                    name: "Yellow Maize (100kg)",
                    stock: "500 bags",
                    price: "₦38,000",
                  },
                  {
                    icon: "🍅",
                    name: "Fresh Tomatoes (crate)",
                    stock: "32 crates",
                    price: "₦5,500",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 backdrop-blur-sm"
                  >
                    <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center text-lg">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-[#C0DD97]">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[#639922]">
                        In stock: {item.stock}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-[#97C459]">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative z-10">
                <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 stroke-[#C0DD97] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#EAF3DE] mb-2">
                  Product & Inventory Management
                </h3>
                <p className="text-sm text-[#97C459] leading-relaxed mb-4">
                  Upload and manage all your products with photos, prices, and
                  stock levels. Bulk upload, instant edits, and real-time
                  inventory tracking built in.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Bulk upload", "Stock alerts", "Price control"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 text-[#C0DD97] border border-white/10"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Grid of smaller cards */}
            {[
              {
                title: "Order Management & Tracking",
                desc: "View all incoming orders in one place. Accept, process, and mark orders as shipped. Buyers get live updates, reducing support queries.",
                icon: (
                  <svg
                    className="w-5 h-5 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
              },
              {
                title: "Built-in Buyer Chat",
                desc: "Communicate directly with buyers to negotiate, answer questions, and confirm order details — without leaving the platform. Fast, simple, and secure messaging.",
                icon: (
                  <svg
                    className="w-5 h-5 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
              {
                title: "Sales Analytics & Reports",
                desc: "Track revenue trends, top-selling products, peak selling times, and customer behaviour with easy-to-understand charts and downloadable reports.",
                icon: (
                  <svg
                    className="w-5 h-5 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                ),
              },
              {
                title: "Secure Payments & Instant Wallet",
                desc: "Buyers pay securely through the app. Funds land in your seller wallet immediately. Withdraw to any Nigerian bank or mobile money wallet with zero delays.",
                icon: (
                  <svg
                    className="w-5 h-5 stroke-[#639922] fill-none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                ),
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="bg-card border border-border hover:border-border/80 hover:shadow-md rounded-[1.5rem] p-8 transition-all fade-in-section"
              >
                <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center mb-5">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WALLET & PAYOUTS */}
      <section className="md:py-24 px-4 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="fade-in-section">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#639922] mb-3">
              Seller Wallet
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              Get Paid Fast.
              <br />
              Withdraw Anytime.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Your earnings are yours. The AgriTec wallet holds your revenue
              securely and lets you withdraw to your bank account or mobile
              money in minutes — not days.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Escrow-Protected Payments",
                  sub: "Buyer funds are held securely until you confirm delivery",
                  icon: (
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  ),
                },
                {
                  title: "Instant Bank Transfers",
                  sub: "Withdraw to GTB, UBA, Access, Opay, PalmPay and more",
                  icon: (
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  ),
                },
                {
                  title: "Mobile-First Withdrawals",
                  sub: "Manage your wallet from your smartphone — no laptop needed",
                  icon: (
                    <>
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </>
                  ),
                },
              ].map((feat, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#EAF3DE] dark:bg-[#639922]/10 shrink-0 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 stroke-[#639922] fill-none"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      {feat.icon}
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground mb-1">
                      {feat.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {feat.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-in-section delay-200">
            <div className="bg-gradient-to-br from-[#173404] to-[#0a2405] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none"></div>
              <div className="absolute -bottom-16 -left-8 w-56 h-56 bg-white/5 rounded-full pointer-events-none"></div>

              <div className="relative z-10">
                <div className="text-sm text-[#97C459] mb-1 uppercase tracking-wider font-semibold">
                  Total Wallet Balance
                </div>
                <div
                  className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1"
                  ref={walletRef}
                >
                  ₦{walletBalance.toLocaleString()}.00
                </div>
                <div className="text-xs text-[#639922] mb-8">
                  Updated just now · May 2026
                </div>

                <div className="flex gap-3 mb-8">
                  <button className="flex-1 bg-[#639922] hover:bg-[#4b7519] transition-colors py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 stroke-white fill-none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    Withdraw
                  </button>
                  <button className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 stroke-white fill-none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Statement
                  </button>
                </div>

                <hr className="border-white/10 mb-4" />

                <div className="space-y-3">
                  {[
                    {
                      dot: "bg-[#639922]",
                      title: "Order #4821 – Maize (100kg)",
                      date: "Today, 10:32 AM",
                      amt: "+₦38,000",
                      color: "text-[#97C459]",
                    },
                    {
                      dot: "bg-[#639922]",
                      title: "Order #4819 – Rice (50kg)",
                      date: "Yesterday, 3:15 PM",
                      amt: "+₦42,500",
                      color: "text-[#97C459]",
                    },
                    {
                      dot: "bg-[#D85A30]",
                      title: "Withdrawal to UBA ****2241",
                      date: "May 27, 2:00 PM",
                      amt: "–₦150,000",
                      color: "text-[#F0997B]",
                    },
                    {
                      dot: "bg-[#639922]",
                      title: "Order #4815 – Tomatoes × 5",
                      date: "May 26, 11:05 AM",
                      amt: "+₦27,500",
                      color: "text-[#97C459]",
                    },
                  ].map((txn, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${txn.dot}`}
                      ></div>
                      <div className="flex-1">
                        <div className="text-xs text-white/90">{txn.title}</div>
                        <div className="text-[10px] text-[#97C459]">
                          {txn.date}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${txn.color}`}>
                        {txn.amt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 md:px-12 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="fade-in-section">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#639922] mb-6">
              Common Questions
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="bg-card border border-border rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="font-medium text-sm text-foreground">
                        {faq.q}
                      </span>
                      <svg
                        className={`w-4 h-4 stroke-muted-foreground fill-none shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <div
                      className={`text-sm text-muted-foreground leading-relaxed px-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-40 pb-4 opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      {faq.a}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fade-in-section delay-200">
            <div className="bg-card border border-border rounded-3xl p-8 lg:p-10 flex flex-col gap-6 shadow-sm">
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase text-[#639922] mb-2">
                  Ready to Start?
                </div>
                <h3 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                  Join 18,000+ Sellers Already Earning on AgriTec
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No setup costs. No monthly fees. List your first products today
                and start receiving orders from verified buyers across Nigeria.
              </p>

              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  "Free to join",
                  "Instant payouts",
                  "Verified buyers",
                  "24/7 support",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground flex items-center gap-1"
                  >
                    <span className="text-[#639922]">✓</span> {chip}
                  </span>
                ))}
              </div>

              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#639922] hover:bg-[#4b7519] text-white text-sm font-medium rounded-xl transition-all"
              >
                Create Your Free Seller Account
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-28 px-4 md:px-12 bg-[#173404] overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5 pointer-events-none"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10 fade-in-section">
          <div className="inline-block bg-white/10 text-[#C0DD97] border border-white/10 rounded-full px-4 py-1.5 text-xs font-medium tracking-wider uppercase mb-6">
            Get Started Today — It's Free
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Your Farm Store Is
            <br />
            One Click Away
          </h2>
          <p className="text-lg text-[#97C459] mb-10 leading-relaxed font-light">
            Join thousands of Nigerian farmers and agricultural vendors who are
            reaching more buyers, selling more produce, and earning more — all
            through AgriTec.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-white/90 text-[#173404] text-base font-semibold rounded-xl transition-all active:scale-95"
            >
              Open Your Store Free
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-base font-semibold rounded-xl transition-all"
            >
              Download the Buyer App
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              {
                text: "Secured payments",
                icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
              },
              {
                text: "No hidden fees",
                icon: (
                  <>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </>
                ),
              },
              {
                text: "340k+ verified buyers",
                icon: (
                  <>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </>
                ),
              },
              {
                text: "Withdraw in minutes",
                icon: (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </>
                ),
              },
            ].map((trust, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-[#97C459]"
              >
                <svg
                  className="w-4 h-4 stroke-[#639922] fill-none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  {trust.icon}
                </svg>
                {trust.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background border-t border-border pt-16 pb-8 px-4 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg text-foreground mb-4 -ml-7"
              >
                  <Image
                    src="/logo.png"
                    alt="AgriTec Logo"
                    width={160}
                    height={160}
                    className="object-contain"
                  />
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Nigeria's leading agricultural marketplace. Connecting farmers
                and vendors directly to buyers nationwide.
              </p>
              <div className="inline-flex items-center gap-2 bg-[#EAF3DE] dark:bg-[#639922]/10 border border-[#C0DD97] dark:border-[#639922]/30 text-[#27500A] dark:text-[#97C459] rounded-full px-3 py-1 text-xs font-medium">
                🇳🇬 Made for Nigerian Farmers
              </div>
            </div>

            {[
              {
                title: "Sell",
                links: [
                  "Open a Store",
                  "How It Works",
                  "Seller Dashboard",
                  "Pricing & Fees",
                ],
              },
              {
                title: "Tools",
                links: [
                  "Seller Wallet",
                  "Order Manager",
                  "Analytics",
                  "Buyer Chat",
                ],
              },
              {
                title: "Support",
                links: [
                  "Help Center",
                  "Contact Us",
                  "Seller Community",
                  "Dispute Resolution",
                ],
              },
              {
                title: "Company",
                links: [
                  "About AgriTec",
                  "Blog",
                  "Privacy Policy",
                  "Terms of Use",
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h5 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">
                  {col.title}
                </h5>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-sm text-muted-foreground hover:text-[#639922] transition-colors"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} AgriTec Technologies Ltd. All rights
              reserved. · Lagos, Nigeria
            </div>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-[#639922] transition-colors">
                Twitter / X
              </Link>
              <Link href="#" className="hover:text-[#639922] transition-colors">
                LinkedIn
              </Link>
              <Link href="#" className="hover:text-[#639922] transition-colors">
                Instagram
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
