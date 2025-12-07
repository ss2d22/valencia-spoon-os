"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaperUploader } from "@/components/PaperUploader";
// Using mock API for UI testing - switch back to "@/lib/api" when ready for backend integration
import { submitPaper, submitText } from "@/lib/mockApi";
import {
  Moon,
  Sun,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Shield,
  BarChart3,
  Scale,
  AlertTriangle,
  Zap,
  Lock,
  Clock,
} from "lucide-react";

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
    title: "Multi-Agent Analysis",
    description: "Four specialized AI agents analyze your paper from different perspectives",
  },
  {
    title: "Voice Debate",
    description: "Agents debate in unique voices using ElevenLabs synthesis",
  },
  {
    title: "Blockchain Verified",
    description: "Verdicts stored immutably on Neo blockchain + AIOZ storage",
  },
  {
    title: "Instant Results",
    description: "Get comprehensive analysis in minutes, not weeks",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitPaper(file);
      router.push(`/tribunal?session=${result.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit paper");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (text: string, title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitText(text, title);
      router.push(`/tribunal?session=${result.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit paper");
    } finally {
      setIsLoading(false);
    }
  };

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

          <div className="relative max-w-7xl mx-auto w-full z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left side - Content */}
              <div className="space-y-8 animate-fade-in-up">
                <div className="inline-flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-4 py-1.5 bg-primary/10 border-primary/20 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 mr-2 animate-pulse" />
                    SpoonOS + Neo Hackathon
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1]">
                    <span className="block bg-gradient-to-r from-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                    AI Tribunal for Research
                    </span>
                    <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      Validation
                    </span>
                  </h1>
                </div>

                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty max-w-xl">
                  Four specialized AI agents adversarially debate and critique your
                  research paper, producing a blockchain-verified verdict with
                  critical issues identified.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/30 group relative overflow-hidden text-lg px-8 py-6"
                    onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <span className="relative z-10 flex items-center">
                      Submit Your Paper
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="hover:scale-105 transition-all duration-300 bg-background/80 backdrop-blur-sm border-2 hover:border-primary/50 text-lg px-8 py-6"
                    onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    See how it works
                  </Button>
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
                {/* Glow effects */}
                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-3xl animate-pulse" />
                <div className="absolute -inset-2 bg-primary/10 blur-xl rounded-3xl" />
                
                {/* Floating animation */}
                <div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
                  <div className="relative glass-card border-2 border-primary/20 shadow-2xl p-6">
                    <PaperUploader
                      onSubmit={handleSubmit}
                      onTextSubmit={handleTextSubmit}
                      isLoading={isLoading}
                    />
                    {error && (
                      <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in-up">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <span className="text-xs">Scroll to explore</span>
              <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-2">
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" />
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
                Four specialized agents analyze your paper from different perspectives
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
                A simple process that delivers rigorous analysis
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
                    "Multiple expert perspectives catch what single reviewers miss",
                    "AI agents never get tired or biased",
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

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <Badge variant="secondary" className="text-sm px-4 py-1.5 mb-4">
                Ready to get started?
              </Badge>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Submit your paper for tribunal review.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get instant, objective, and immutable critique using multi-agent AI debate.
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/25 group text-lg px-8 py-6"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Submit Your Paper
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
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
              <span className="hover:text-foreground transition-colors">AIOZ Storage</span>
              <span className="hover:text-foreground transition-colors">ElevenLabs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
