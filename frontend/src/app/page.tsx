"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaperUploader } from "@/components/PaperUploader";
import {
  Moon,
  Sun,
  FileText,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Mic,
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  Scale,
  Shield,
} from "lucide-react";
import Link from "next/link";

const agents = [
  {
    name: "The Skeptic",
    description: "Questions everything, finds alternative explanations",
    icon: AlertTriangle,
    bgGradient: "bg-black",
  },
  {
    name: "The Statistician",
    description: "Audits numbers, catches p-hacking and statistical errors",
    icon: BarChart3,
    bgGradient: "bg-black",
  },
  {
    name: "The Methodologist",
    description: "Evaluates experimental design and methodology",
    icon: Scale,
    bgGradient: "bg-black",
  },
  {
    name: "The Ethicist",
    description: "Identifies bias, conflicts of interest, and ethical issues",
    icon: Shield,
    bgGradient: "bg-black",
  },
];

const features = [
  {
    title: "Voice Conversation",
    description: "Speak naturally with agents and hear their responses aloud",
  },
  {
    title: "Multi-Agent Analysis",
    description: "Four specialized AI agents analyze your paper from different perspectives",
  },
  {
    title: "Blockchain Verified",
    description: "Verdicts stored immutably on Neo blockchain + Mem0 memory",
  },
  {
    title: "Instant Results",
    description: "Get comprehensive analysis in minutes, not weeks",
  },
];

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 gradient-mesh opacity-40 pointer-events-none" />
      <div className="fixed inset-0 grid-background opacity-30 pointer-events-none" />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Adversarial Science
                </span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a
                  href="#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  How it works
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                </a>
                <a
                  href="#tribunal"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  The Tribunal
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                </a>
                <Link
                  href="/interactive"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
                >
                  <Mic className="h-4 w-4" />
                  Live Mode
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#how-it-works"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                How it works
              </a>
              <a
                href="#tribunal"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                The Tribunal
              </a>
              <Link
                href="/interactive"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Mic className="h-4 w-4" />
                Live Mode
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex items-center">
          {/* Animated background elements */}
          <div className="absolute inset-0 radial-glow opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,119,198,0.2),transparent_50%)]" />

          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full blur-sm animate-float"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${4 + i}s`,
                }}
              />
            ))}
          </div>

          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <Badge variant="secondary">SpoonOS + Neo Hackathon</Badge>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  AI Tribunal for Research Validation
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty">
                  Have a live voice conversation with four AI agents who adversarially
                  debate and critique your research paper. Speak naturally, get instant feedback.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
                    onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <Mic className="w-4 h-4" />
                    Start Voice Tribunal
                  </Button>
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="hover:scale-105 transition-all duration-300 bg-background/80 backdrop-blur-sm border-2 hover:border-primary/50 gap-2 w-full sm:w-auto"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      View Dashboard
                    </Button>
                  </Link>
                </div>

                {/* Stats or highlights */}
                <div className="flex flex-wrap gap-6 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">4 Expert Agents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
                    <span className="text-sm text-muted-foreground">Blockchain Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "1s" }} />
                    <span className="text-sm text-muted-foreground">Instant Results</span>
                  </div>
                </div>
              </div>

              {/* Right side - Upload Card */}
              <div className="relative" id="upload">
                <PaperUploader />
              </div>
            </div>
          </div>
        </section>

        {/* Tribunal Section */}
        <section id="tribunal" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <Badge variant="outline" className="mb-4">The Tribunal</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Four Expert Perspectives
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four specialized agents analyze and debate your paper in real-time
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {agents.map((agent, i) => {
                const Icon = agent.icon;
                return (
                  <Card
                    key={agent.name}
                    className={`p-6 card-hover-glow relative overflow-hidden group border-2 transition-all duration-300 ${
                      i % 2 === 0 ? "lg:animate-fade-in-up" : "lg:animate-fade-in-up"
                    }`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className={`absolute inset-0 ${agent.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative space-y-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${agent.bgGradient} shrink-0`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <h3 className="text-lg font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <Badge variant="outline" className="mb-4">Process</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A natural voice conversation that delivers rigorous analysis
              </p>
            </div>

            {/* Vertical Timeline Design */}
            <div className="relative max-w-4xl mx-auto">
              {/* Timeline line */}
              <div className="space-y-12">
                {features.map((feature, i) => {
                  const isEven = i % 2 === 0;

                  return (
                    <div
                      key={feature.title}
                      className="relative flex items-center gap-8 group"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      {/* Timeline dot */}
                      <div className="hidden md:flex shrink-0 w-16 h-16 items-center justify-center relative z-10">
                        <div className="absolute w-6 h-6 rounded-full bg-primary ring-4 ring-background group-hover:scale-125 transition-transform" />
                        <div className="absolute w-6 h-6 rounded-full bg-primary/20 group-hover:scale-150 transition-transform" />
                      </div>

                      {/* Content Card */}
                      <Card className={`flex-1 card-hover-glow border-2 relative overflow-hidden ${
                        isEven ? "md:ml-0" : "md:ml-24"
                      }`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-6 relative">
                          <div className="flex items-start gap-4">
                            {/* Step number badge */}
                            <div className="shrink-0 w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                              {i + 1}
                            </div>

                            <div className="flex-1 space-y-2">
                              <CardTitle className="text-xl">{feature.title}</CardTitle>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-transparent to-primary/5" />
          <div className="relative max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold">Peer review is broken.</h2>
                </div>
                <div className="space-y-4">
                  {[
                    "70% of studies fail to replicate",
                    "Reviewers miss critical statistical errors",
                    "Conflicts of interest go undetected",
                  ].map((text, i) => (
                    <Card
                      key={i}
                      className="p-4 card-hover-glow border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold">Adversarial Science fixes that.</h2>
                </div>
                <div className="space-y-4">
                  {[
                    "Have a real conversation with AI reviewers",
                    "Ask follow-up questions and get instant answers",
                    "Verdicts are stored immutably on blockchain",
                  ].map((text, i) => (
                    <Card
                      key={i}
                      className="p-4 card-hover-glow border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-balance">
              Start a live tribunal conversation.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your paper and speak directly with the AI agents. They'll analyze, debate, and answer your questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <Mic className="w-5 h-5" />
                Start Voice Tribunal
              </Button>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="hover:scale-105 transition-transform gap-2 w-full sm:w-auto"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  View Past Verdicts
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border relative">
        <div className="absolute inset-0 bg-gradient-to-t from-muted/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Adversarial Science</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for SpoonOS + Neo Agentic Hackathon
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="hover:text-foreground transition-colors">Neo Blockchain</span>
              <span className="hover:text-foreground transition-colors">Mem0 Memory</span>
              <span className="hover:text-foreground transition-colors">ElevenLabs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
